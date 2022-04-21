/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Duration } from 'moment';
import type { Observable } from 'rxjs';
import { firstValueFrom, from, of, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  map,
  shareReplay,
  takeWhile,
} from 'rxjs/operators';
import tls from 'tls';

import type {
  ElasticsearchClient,
  ElasticsearchServicePreboot,
  ICustomClusterClient,
  Logger,
  ScopeableRequest,
} from 'src/core/server';

import { pollEsNodesVersion } from '../../../../src/core/server';
import { ElasticsearchConnectionStatus } from '../common';
import type { Certificate, PingResult } from '../common';
import { CompatibilityError } from './compatibility_error';
import { getDetailedErrorMessage, getErrorStatusCode } from './errors';

export interface EnrollParameters {
  apiKey: string;
  hosts: readonly string[];
  caFingerprint: string;
}

export interface AuthenticateParameters {
  host: string;
  username?: string;
  password?: string;
  caCert?: string;
}

export interface ElasticsearchServiceSetupDeps {
  /**
   * Core Elasticsearch service preboot contract;
   */
  elasticsearch: Pick<ElasticsearchServicePreboot, 'createClient'>;

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

  /**
   * Tries to authenticate specified user with cluster.
   */
  authenticate: (params: AuthenticateParameters) => Promise<void>;

  /**
   * Tries to connect to specified cluster and fetches certificate chain.
   */
  ping: (host: string) => Promise<PingResult>;
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
  caCert: string;
  /**
   * Service account token for the "elastic/kibana" service account.
   */
  serviceAccountToken: { name: string; value: string };
}

export interface EnrollKibanaResponse {
  token: { name: string; value: string };
  http_ca: string;
}

export interface AuthenticateResult {
  host: string;
  username?: string;
  password?: string;
  caCert?: string;
}

export class ElasticsearchService {
  /**
   * Elasticsearch client used to check Elasticsearch connection status.
   */
  private connectionStatusClient?: ICustomClusterClient;

  constructor(private readonly logger: Logger, private kibanaVersion: string) {}

  public setup({
    elasticsearch,
    connectionCheckInterval,
  }: ElasticsearchServiceSetupDeps): ElasticsearchServiceSetup {
    const connectionStatusClient = (this.connectionStatusClient =
      elasticsearch.createClient('connectionStatus'));

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
      authenticate: this.authenticate.bind(this, elasticsearch),
      ping: this.ping.bind(this, elasticsearch),
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
    elasticsearch: Pick<ElasticsearchServicePreboot, 'createClient'>,
    { apiKey, hosts, caFingerprint }: EnrollParameters
  ) {
    const scopeableRequest: ScopeableRequest = { headers: { authorization: `ApiKey ${apiKey}` } };

    // We should iterate through all provided hosts until we find an accessible one.
    for (const host of hosts) {
      this.logger.debug(
        `Trying to enroll with "${host}" host using "${caFingerprint}" CA fingerprint.`
      );

      const enrollClient = elasticsearch.createClient('enroll', {
        hosts: [host],
        caFingerprint,
        ssl: { verificationMode: 'none' },
      });

      let enrollmentResponse: TransportResult<EnrollKibanaResponse>;
      try {
        enrollmentResponse = await enrollClient
          .asScoped(scopeableRequest)
          .asCurrentUser.transport.request<EnrollKibanaResponse>(
            {
              method: 'GET',
              path: '/_security/enroll/kibana',
            },
            { meta: true }
          );
      } catch (err) {
        // We expect that all hosts belong to exactly same node and any non-connection error for one host would mean
        // that enrollment will fail for any other host and we should bail out.
        if (err instanceof errors.ConnectionError || err instanceof errors.TimeoutError) {
          this.logger.error(
            `Unable to connect to host "${host}", will proceed to the next host if available: ${getDetailedErrorMessage(
              err
            )}`
          );
          continue;
        }

        this.logger.error(`Failed to enroll with host "${host}": ${getDetailedErrorMessage(err)}`);
        throw err;
      } finally {
        await enrollClient.close();
      }

      this.logger.debug(
        `Successfully enrolled with host "${host}", token name: ${enrollmentResponse.body.token.name}, CA certificate: ${enrollmentResponse.body.http_ca}`
      );

      const enrollResult: EnrollResult = {
        host,
        caCert: ElasticsearchService.createPemCertificate(enrollmentResponse.body.http_ca),
        serviceAccountToken: enrollmentResponse.body.token,
      };

      // Now try to use retrieved service account and CA certificate to authenticate to this host.
      const authenticateClient = elasticsearch.createClient('authenticate', {
        caFingerprint,
        hosts: [host],
        serviceAccountToken: enrollResult.serviceAccountToken.value,
        ssl: { certificateAuthorities: [enrollResult.caCert] },
      });

      this.logger.debug(
        `Verifying if "${enrollmentResponse.body.token.name}" token can authenticate to host "${host}".`
      );

      try {
        await authenticateClient.asInternalUser.security.authenticate();
        this.logger.debug(
          `Successfully authenticated "${enrollmentResponse.body.token.name}" token to host "${host}".`
        );
      } catch (err) {
        this.logger.error(
          `Failed to authenticate "${
            enrollmentResponse.body.token.name
          }" token to host "${host}": ${getDetailedErrorMessage(err)}.`
        );
        await authenticateClient.close();
        throw err;
      }

      const versionCompatibility = await this.checkCompatibility(authenticateClient.asInternalUser);
      await authenticateClient.close();
      if (!versionCompatibility.isCompatible) {
        this.logger.error(
          `Failed compatibility check of host "${host}": ${versionCompatibility.message}`
        );
        throw new CompatibilityError(versionCompatibility);
      }

      return enrollResult;
    }

    throw new Error('Unable to connect to any of the provided hosts.');
  }

  private async authenticate(
    elasticsearch: Pick<ElasticsearchServicePreboot, 'createClient'>,
    { host, username, password, caCert }: AuthenticateParameters
  ) {
    const client = elasticsearch.createClient('authenticate', {
      hosts: [host],
      username,
      password,
      ssl: caCert ? { certificateAuthorities: [caCert] } : undefined,
    });

    try {
      // Using `ping` instead of `authenticate` allows us to verify clusters with both
      // security enabled and disabled.
      await client.asInternalUser.ping();
    } catch (error) {
      this.logger.error(
        `Failed to authenticate with host "${host}": ${getDetailedErrorMessage(error)}`
      );
      await client.close();
      throw error;
    }

    const versionCompatibility = await this.checkCompatibility(client.asInternalUser);
    await client.close();
    if (!versionCompatibility.isCompatible) {
      this.logger.error(
        `Failed compatibility check of host "${host}": ${versionCompatibility.message}`
      );
      throw new CompatibilityError(versionCompatibility);
    }
  }

  private async ping(
    elasticsearch: Pick<ElasticsearchServicePreboot, 'createClient'>,
    host: string
  ) {
    const client = elasticsearch.createClient('ping', {
      hosts: [host],
      username: '',
      password: '',
      ssl: { verificationMode: 'none' },
    });

    this.logger.debug(`Connecting to host "${host}"`);
    let authRequired = false;
    try {
      await client.asInternalUser.ping();
    } catch (error) {
      if (
        error instanceof errors.ConnectionError ||
        error instanceof errors.TimeoutError ||
        error instanceof errors.ProductNotSupportedError
      ) {
        this.logger.error(`Unable to connect to host "${host}": ${getDetailedErrorMessage(error)}`);
        await client.close();
        throw error;
      }

      authRequired = getErrorStatusCode(error) === 401;
    }

    this.logger.debug(`Fetching certificate chain from host "${host}"`);
    let certificateChain: Certificate[] | undefined;
    const { protocol, hostname, port } = new URL(host);
    if (protocol === 'https:') {
      try {
        const cert = await ElasticsearchService.fetchPeerCertificate(hostname, port);
        certificateChain = ElasticsearchService.flattenCertificateChain(cert).map(
          ElasticsearchService.getCertificate
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch peer certificate from host "${host}": ${getDetailedErrorMessage(error)}`
        );
        await client.close();
        throw error;
      }
    }

    // This check is a security requirement - Do not remove it!
    this.logger.debug(`Verifying that host "${host}" responds with Elastic product header`);

    try {
      const response = await client.asInternalUser.transport.request(
        {
          method: 'OPTIONS',
          path: '/',
        },
        { meta: true }
      );
      if (response.headers?.['x-elastic-product'] !== 'Elasticsearch') {
        throw new Error('Host did not respond with valid Elastic product header.');
      }
    } catch (error) {
      this.logger.error(
        `Host "${host}" is not a valid Elasticsearch cluster: ${getDetailedErrorMessage(error)}`
      );
      await client.close();
      throw error;
    }

    await client.close();

    return {
      authRequired,
      certificateChain,
    };
  }

  private async checkCompatibility(internalClient: ElasticsearchClient) {
    return firstValueFrom(
      pollEsNodesVersion({
        internalClient,
        log: this.logger,
        kibanaVersion: this.kibanaVersion,
        ignoreVersionMismatch: false,
        esVersionCheckInterval: -1, // Passing a negative number here will result in immediate completion after the first value is emitted
      })
    );
  }

  private static fetchPeerCertificate(host: string, port: string | number) {
    return new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
      const socket = tls.connect({ host, port: Number(port), rejectUnauthorized: false });
      socket.once('secureConnect', () => {
        const cert = socket.getPeerCertificate(true);
        socket.destroy();
        resolve(cert);
      });
      socket.once('error', reject);
    });
  }

  private static flattenCertificateChain(
    cert: tls.DetailedPeerCertificate,
    accumulator: tls.DetailedPeerCertificate[] = []
  ) {
    accumulator.push(cert);
    if (cert.issuerCertificate && cert.fingerprint256 !== cert.issuerCertificate.fingerprint256) {
      ElasticsearchService.flattenCertificateChain(cert.issuerCertificate, accumulator);
    }
    return accumulator;
  }

  private static getCertificate(cert: tls.DetailedPeerCertificate): Certificate {
    return {
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      subject: cert.subject,
      fingerprint256: cert.fingerprint256,
      raw: cert.raw.toString('base64'),
    };
  }

  public static createPemCertificate(derCaString: string) {
    // Use `X509Certificate` class once we upgrade to Node v16.
    return `-----BEGIN CERTIFICATE-----\n${derCaString
      .replace(/_/g, '/')
      .replace(/-/g, '+')
      .replace(/([^\n]{1,65})/g, '$1\n')
      .replace(/\n$/g, '')}\n-----END CERTIFICATE-----\n`;
  }

  public static formatFingerprint(caFingerprint: string) {
    // Convert a plain hex string returned in the enrollment token to a format that ES client
    // expects, i.e. to a colon delimited hex string in upper case: deadbeef -> DE:AD:BE:EF.
    return (
      caFingerprint
        .toUpperCase()
        .match(/.{1,2}/g)
        ?.join(':') ?? ''
    );
  }
}
