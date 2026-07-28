/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generic "configured fetch" primitive shared by HTTP-based client types.
 *
 * A `ConfiguredFetchFactory` produces a `fetch` that already applies the Actions outbound-HTTP
 * policy (SSL/TLS, proxy, User-Agent, timeout, body-size limits). It is the `fetch` sibling of
 * the axios instance vended by `get_axios_instance`. Client types compose it; the generic
 * `BuildContext` intentionally does not carry it, so non-HTTP clients stay unaffected.
 */
export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface ConfiguredFetchResource {
  readonly fetch: FetchLike;
  close(): Promise<void>;
}

export interface ConfiguredFetchOptions {
  readonly targetUrl: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export type ConfiguredFetchFactory = (options: ConfiguredFetchOptions) => ConfiguredFetchResource;
