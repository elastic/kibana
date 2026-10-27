/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext, HostTarget } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';

const MESSAGE = 'cannot be proxied';

const makeCtx = (proxySettings: unknown): BuildContext =>
  ({
    networkSettings: { getProxySettings: jest.fn().mockReturnValue(proxySettings) },
  } as unknown as BuildContext);

const target = (hostname: string): HostTarget => ({ hostname, port: 1433 });

describe('ensureNoProxyRequired', () => {
  it('allows a direct connection when no proxy is configured', () => {
    expect(() =>
      ensureNoProxyRequired(makeCtx(undefined), [target('db.example.com')], MESSAGE)
    ).not.toThrow();
  });

  it('throws the given message when the host would be proxied', () => {
    const ctx = makeCtx({ proxyUrl: 'http://proxy:8080' });

    expect(() => ensureNoProxyRequired(ctx, [target('db.example.com')], MESSAGE)).toThrow(MESSAGE);
  });

  it('allows a host listed in proxyBypassHosts', () => {
    const ctx = makeCtx({
      proxyUrl: 'http://proxy:8080',
      proxyBypassHosts: new Set(['db.example.com']),
    });

    expect(() => ensureNoProxyRequired(ctx, [target('db.example.com')], MESSAGE)).not.toThrow();
  });

  it('allows a host outside proxyOnlyHosts, and throws for one inside it', () => {
    const ctx = makeCtx({
      proxyUrl: 'http://proxy:8080',
      proxyOnlyHosts: new Set(['proxied.example.com']),
    });

    expect(() => ensureNoProxyRequired(ctx, [target('db.example.com')], MESSAGE)).not.toThrow();
    expect(() => ensureNoProxyRequired(ctx, [target('proxied.example.com')], MESSAGE)).toThrow(
      MESSAGE
    );
  });

  it('throws when any one of several targets would be proxied', () => {
    const ctx = makeCtx({
      proxyUrl: 'http://proxy:8080',
      proxyBypassHosts: new Set(['direct.example.com']),
    });

    expect(() =>
      ensureNoProxyRequired(
        ctx,
        [target('direct.example.com'), target('other.example.com')],
        MESSAGE
      )
    ).toThrow(MESSAGE);
  });
});
