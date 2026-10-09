/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rootCertificates } from 'node:tls';
import { Agent, type Dispatcher } from 'undici';
import type { IBasePath } from '@kbn/core-http-server';
import type { HttpConfig } from './http_config';

interface SelfHttpDispatcherProviderParams {
  readonly basePath: IBasePath;
  readonly getHttpConfig: () => HttpConfig;
  readonly target: 'auto' | 'local';
}

export class SelfHttpDispatcherProvider {
  private dispatcher?: Agent;
  private trustKey?: string;

  constructor(private readonly params: SelfHttpDispatcherProviderParams) {}

  public get(url: URL): Dispatcher | undefined {
    if (url.protocol !== 'https:') {
      return undefined;
    }

    const config = this.params.getHttpConfig();
    const usesLocalTarget =
      this.params.target === 'local' ||
      (this.params.target === 'auto' && !this.params.basePath.publicBaseUrl);
    // Local self calls loop back to this listener, so trust its leaf certificate directly.
    const additionalCertificateAuthorities = usesLocalTarget
      ? [config.ssl.certificate, ...(config.ssl.certificateAuthorities ?? [])]
      : config.selfHttp.ssl.certificateAuthorities ?? [];
    const certificateAuthorities = additionalCertificateAuthorities.filter(
      (certificate): certificate is string => certificate !== undefined
    );

    if (certificateAuthorities.length === 0) {
      this.replaceDispatcher(undefined, undefined);
      return undefined;
    }

    const trustKey = `${usesLocalTarget ? 'local' : 'public'}:${certificateAuthorities.join('\n')}`;
    if (this.dispatcher && this.trustKey === trustKey) {
      return this.dispatcher;
    }

    this.replaceDispatcher(
      new Agent({
        connect: {
          ca: [...rootCertificates, ...certificateAuthorities],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      }),
      trustKey
    );
    return this.dispatcher;
  }

  public async close(): Promise<void> {
    const dispatcher = this.dispatcher;
    this.dispatcher = undefined;
    this.trustKey = undefined;
    await dispatcher?.close();
  }

  private replaceDispatcher(dispatcher: Agent | undefined, trustKey: string | undefined): void {
    const previousDispatcher = this.dispatcher;
    this.dispatcher = dispatcher;
    this.trustKey = trustKey;
    if (previousDispatcher && previousDispatcher !== dispatcher) {
      void previousDispatcher.close();
    }
  }
}
