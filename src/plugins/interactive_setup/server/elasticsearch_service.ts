/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApiResponse } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { Duration } from 'moment';
import type { Observable } from 'rxjs';
import { from, of, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  shareReplay,
  takeWhile,
} from 'rxjs/operators';

import type {
  ElasticsearchClientConfig,
  ElasticsearchServicePreboot,
  ICustomClusterClient,
  Logger,
  ScopeableRequest,
} from 'src/core/server';

import { ElasticsearchConnectionStatus } from '../common';
import { getDetailedErrorMessage } from './errors';

interface EnrollParameters {
  apiKey: string;
  hosts: string[];
  caFingerprint: string;
}

export interface ElasticsearchServiceSetupDeps {
  /**
   * Core Elasticsearch service preboot contract;
   */
  elasticsearch: ElasticsearchServicePreboot;

  /**
   * Interval for the Elasticsearch connection check (whether it's configured or not).
   */
  connectionCheckInterval: Duration;
}

export interface ElasticsearchServiceSetup {
  /**
   * Observable that yields the last result of the Elasticsearch connection status check.
   */
  connectionStatus$: Observable<ElasticsearchConnectionStatus>;

  /**
   * Iterates through provided {@param hosts} one by one trying to call Kibana enrollment API using
   * the specified {@param apiKey}.
   * @param apiKey The ApiKey to use to authenticate Kibana enrollment request.
   * @param hosts The list of Elasticsearch node addresses to enroll with. The addresses are supposed
   * to point to exactly same Elasticsearch node, potentially available via different network interfaces.
   */
  enroll: (params: EnrollParameters) => Promise<EnrollResult>;
}

/**
 * Result of the enrollment request.
 */
export interface EnrollResult {
  /**
   * Host address of the Elasticsearch node that successfully processed enrollment request.
   */
  host: string;
  /**
   * PEM CA certificate for the Elasticsearch HTTP certificates.
   */
  ca: string;
  /**
   * Service account token for the "elastic/kibana" service account.
   */
  serviceAccountToken: { name: string; value: string };
}

export class ElasticsearchService {
  /**
   * Elasticsearch client used to check Elasticsearch connection status.
   */
  private connectionStatusClient?: ICustomClusterClient;
  constructor(private readonly logger: Logger) {}

  public setup({
    elasticsearch,
    connectionCheckInterval,
  }: ElasticsearchServiceSetupDeps): ElasticsearchServiceSetup {
    const connectionStatusClient = (this.connectionStatusClient = elasticsearch.createClient(
      'ping'
    ));

    return {
      connectionStatus$: timer(0, connectionCheckInterval.asMilliseconds()).pipe(
        exhaustMap(() => {
          return from(connectionStatusClient.asInternalUser.ping()).pipe(
            map(() => ElasticsearchConnectionStatus.Configured),
            catchError((pingError) =>
              of(
                pingError instanceof errors.ConnectionError
                  ? ElasticsearchConnectionStatus.NotConfigured
                  : ElasticsearchConnectionStatus.Configured
              )
            )
          );
        }),
        takeWhile(
          (status) => status !== ElasticsearchConnectionStatus.Configured,
          /* inclusive */ true
        ),
        distinctUntilChanged(),
        shareReplay({ refCount: true, bufferSize: 1 })
      ),
      enroll: this.enroll.bind(this, elasticsearch),
    };
  }

  public stop() {
    if (this.connectionStatusClient) {
      this.connectionStatusClient.close().catch((err) => {
        this.logger.debug(`Failed to stop Elasticsearch service: ${getDetailedErrorMessage(err)}`);
      });
      this.connectionStatusClient = undefined;
    }
  }

  /**
   * Iterates through provided {@param hosts} one by one trying to call Kibana enrollment API using
   * the specified {@param apiKey}.
   * @param elasticsearch Core Elasticsearch service preboot contract.
   * @param apiKey The ApiKey to use to authenticate Kibana enrollment request.
   * @param hosts The list of Elasticsearch node addresses to enroll with. The addresses are supposed
   * to point to exactly same Elasticsearch node, potentially available via different network interfaces.
   * @param caFingerprint The fingerprint of the root CA certificate that is supposed to sign certificate presented by
   * the Elasticsearch node we're enrolling with. Should be in a form of a hex colon-delimited string in upper case.
   */
  private async enroll(
    elasticsearch: ElasticsearchServicePreboot,
    { apiKey, hosts, caFingerprint }: EnrollParameters
  ): Promise<EnrollResult> {
    const scopeableRequest: ScopeableRequest = { headers: { authorization: `ApiKey ${apiKey}` } };
    const elasticsearchConfig: Partial<ElasticsearchClientConfig> = {
      ssl: { verificationMode: 'none' },
    };

    // We should iterate through all provided hosts until we find an accessible one.
    for (const host of hosts) {
      this.logger.debug(
        `Trying to enroll with "${host}" host using "${caFingerprint}" CA fingerprint.`
      );

      const enrollClient = elasticsearch.createClient('enroll', {
        ...elasticsearchConfig,
        hosts: [host],
        caFingerprint,
      });

      let enrollmentResponse;
      try {
        enrollmentResponse = (await enrollClient
          .asScoped(scopeableRequest)
          .asCurrentUser.transport.request({
            method: 'GET',
            path: '/_security/enroll/kibana',
          })) as ApiResponse<{ token: { name: string; value: string }; http_ca: string }>;
      } catch (err) {
        // We expect that all hosts belong to exactly same node and any non-connection error for one host would mean
        // that enrollment will fail for any other host and we should bail out.
        if (err instanceof errors.ConnectionError || err instanceof errors.TimeoutError) {
          this.logger.error(
            `Unable to connect to "${host}" host, will proceed to the next host if available: ${getDetailedErrorMessage(
              err
            )}`
          );
          continue;
        }

        this.logger.error(`Failed to enroll with "${host}" host: ${getDetailedErrorMessage(err)}`);
        throw err;
      } finally {
        await enrollClient.close();
      }

      this.logger.debug(
        `Successfully enrolled with "${host}" host, token name: ${enrollmentResponse.body.token.name}, CA certificate: ${enrollmentResponse.body.http_ca}`
      );

      const enrollResult = {
        host,
        ca: ElasticsearchService.createPemCertificate(enrollmentResponse.body.http_ca),
        serviceAccountToken: enrollmentResponse.body.token,
      };

      // Now try to use retrieved password and CA certificate to authenticate to this host.
      const authenticateClient = elasticsearch.createClient('authenticate', {
        caFingerprint,
        hosts: [host],
        serviceAccountToken: enrollResult.serviceAccountToken.value,
        ssl: { certificateAuthorities: [enrollResult.ca] },
      });

      this.logger.debug(
        `Verifying if "${enrollmentResponse.body.token.name}" token can authenticate to "${host}" host.`
      );

      try {
        await authenticateClient.asInternalUser.security.authenticate();
        this.logger.debug(
          `Successfully authenticated "${enrollmentResponse.body.token.name}" token to "${host}" host.`
        );
      } catch (err) {
        this.logger.error(
          `Failed to authenticate "${
            enrollmentResponse.body.token.name
          }" token to "${host}" host: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      } finally {
        await authenticateClient.close();
      }

      return enrollResult;
    }

    throw new Error('Unable to connect to any of the provided hosts.');
  }

  private static createPemCertificate(derCaString: string) {
    // Use `X509Certificate` class once we upgrade to Node v16.
    return `-----BEGIN CERTIFICATE-----\n${derCaString
      .replace(/_/g, '/')
      .replace(/-/g, '+')
      .replace(/([^\n]{1,65})/g, '$1\n')
      .replace(/\n$/g, '')}\n-----END CERTIFICATE-----\n`;
  }
}
