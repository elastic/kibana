/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import https from 'https';
import type { RequestInit, Response } from 'node-fetch';

import fetch from 'node-fetch';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { UsageRecord } from './types';

/**
 * Config shape accepted by UsageReportingService.
 *
 * When supplied by the Usage API plugin, `url` is already the full endpoint.
 * When falling back to the plugin's own config, the caller must append the
 * endpoint path before passing the config here.
 */
export interface UsageReportingConfig {
  enabled: boolean;
  url?: string;
  tls?: {
    certificate: string;
    key: string;
    ca: string;
  };
}

/**
 * HTTP client for sending UsageRecords to the Usage API.
 *
 * Based on the pattern from security_solution_serverless UsageReportingService.
 * Supports mTLS authentication required by the Usage API in cloud environments.
 */
export class UsageReportingService {
  private agent: https.Agent | undefined;

  constructor(
    private readonly config: UsageReportingConfig,
    private readonly kibanaVersion: string
  ) {}

  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    const reqArgs: RequestInit = {
      method: 'post',
      body: JSON.stringify(records),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Kibana/${this.kibanaVersion} node-fetch`,
      },
    };

    if (this.usageApiUrl.startsWith('https')) {
      reqArgs.agent = this.httpAgent;
    }

    return fetch(this.usageApiUrl, reqArgs);
  }

  private get usageApiUrl(): string {
    const { url } = this.config;
    if (!url) {
      throw new Error('Usage API URL not configured for workflows metering');
    }
    return url;
  }

  private get httpAgent(): https.Agent {
    if (this.agent) {
      return this.agent;
    }

    const { tls } = this.config;
    if (!tls) {
      throw new Error('Usage API TLS configuration not provided for workflows metering');
    }

    const tlsConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: tls.certificate,
        key: tls.key,
        certificateAuthorities: tls.ca,
      })
    );

    this.agent = new https.Agent({
      rejectUnauthorized: tlsConfig.rejectUnauthorized,
      cert: tlsConfig.certificate,
      key: tlsConfig.key,
      ca: tlsConfig.certificateAuthorities,
      allowPartialTrustChain: true,
    });

    return this.agent;
  }
}
