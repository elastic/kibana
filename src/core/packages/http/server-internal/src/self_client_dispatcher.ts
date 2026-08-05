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
  private readonly dispatchers = new Map<'local' | 'public', { agent?: Agent; trustKey?: string }>();

  constructor(private readonly params: SelfHttpDispatcherProviderParams) {}

  public get(url: URL, target: 'local' | 'public'): Dispatcher | undefined {
    if (url.protocol !== 'https:') {
      return undefined;
    }

    const config = this.params.getHttpConfig();
    const usesLocalTarget = target === 'local';
    // Local self calls loop back to this listener, so trust its leaf certificate directly.
    const additionalCertificateAuthorities = usesLocalTarget
      ? [config.ssl.certificate, ...(config.ssl.certificateAuthorities ?? [])]
      : config.selfHttp.ssl.certificateAuthorities ?? [];
    const certificateAuthorities = additionalCertificateAuthorities.filter(
      (certificate): certificate is string => certificate !== undefined
    );

    if (certificateAuthorities.length === 0) {
      this.replaceDispatcher(target, undefined, undefined);
      return undefined;
    }

    const trustKey = `${usesLocalTarget ? 'local' : 'public'}:${certificateAuthorities.join('\n')}`;
    const profile = this.dispatchers.get(target) ?? {};
    if (profile.agent && profile.trustKey === trustKey) {
      return profile.agent;
    }

    this.replaceDispatcher(
      target,
      new Agent({
        connect: {
          ca: [...rootCertificates, ...certificateAuthorities],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      }),
      trustKey
    );
    return this.dispatchers.get(target)?.agent;
  }

  public async close(): Promise<void> {
    const dispatchers = [...this.dispatchers.values()];
    this.dispatchers.clear();
    await Promise.all(dispatchers.map(({ agent }) => agent?.close()));
  }

  private replaceDispatcher(
    target: 'local' | 'public',
    dispatcher: Agent | undefined,
    trustKey: string | undefined
  ): void {
    const previousDispatcher = this.dispatchers.get(target)?.agent;
    this.dispatchers.set(target, { agent: dispatcher, trustKey });
    if (previousDispatcher && previousDispatcher !== dispatcher) void previousDispatcher.close();
  }
}
