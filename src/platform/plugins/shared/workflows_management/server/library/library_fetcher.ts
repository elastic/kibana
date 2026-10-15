/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch, { FetchError } from 'node-fetch';
import type { RequestInit, Response } from 'node-fetch';
import pRetry, { AbortError } from 'p-retry';
import type { Logger } from '@kbn/core/server';
import type {
  KibanaVersionsManifest,
  Template,
  TemplateBody,
  TemplatesCatalog,
} from '@kbn/workflows-library';
import {
  KibanaVersionsManifestLenientSchema,
  parseTemplateYaml,
  TemplateParseError,
  TemplatesCatalogLenientSchema,
} from '@kbn/workflows-library';
import { ZodError } from '@kbn/zod/v4';

import { LibraryFetchError, LibraryNotFoundError } from './errors';
import { LibraryCache } from './library_cache';
import { LibrarySource } from './library_source';
import { resolveVersionId } from './resolve_version_id';

/**
 * Default CDN URL the Workflow Template Library fetches its catalog from when
 * `workflowsManagement.library.registryUrl` is not explicitly configured. Kept
 * here (instead of on the config schema as a `defaultValue`) so the
 * `registryUrl` / `bundlePath` mutual-exclusion validator can distinguish "user
 * set this" from "schema defaulted it".
 */
const DEFAULT_LIBRARY_REGISTRY_URL = 'https://workflows.elastic.co/library/v1';
const DEFAULT_RETRY_OPTIONS = { retries: 3, factor: 2, minTimeout: 200 };
/**
 * Per-request timeout (ms) applied to each individual attempt. Bounds a single
 * fetch so a hung socket can't stall a route request indefinitely; retries
 * (see {@link DEFAULT_RETRY_OPTIONS}) still apply on top.
 */
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export interface LibraryFetcherRetryOptions {
  retries?: number;
  factor?: number;
  minTimeout?: number;
}

export interface LibraryFetcherDeps {
  registryUrl?: string;
  kibanaVersion: string;
  isServerless: boolean;
  ttlMs: number;
  logger: Logger;
  /**
   * Override the exponential-backoff retry parameters. Defaults are
   * production-friendly (3 retries, 200ms min, factor 2); tests can lower
   * `minTimeout` to keep retry assertions fast.
   */
  retryOptions?: LibraryFetcherRetryOptions;
  /**
   * Override the per-request timeout in ms (default
   * {@link DEFAULT_REQUEST_TIMEOUT_MS}); tests can lower it to exercise the
   * timeout path quickly.
   */
  requestTimeoutMs?: number;
  /**
   * Override the maximum accepted response sizes in bytes (defaults
   * {@link LibrarySource.MAX_CATALOG_BYTES} for catalog/manifest JSON and
   * {@link LibrarySource.MAX_BODY_BYTES} for template bodies).
   */
  maxCatalogBytes?: number;
  maxBodyBytes?: number;
}

/**
 * Discriminated result for catalog-style fetches: a fresh payload (with its
 * ETag, if the server sent one) or the sentinel that the upstream returned
 * `304 Not Modified` against the previously cached ETag.
 */
type FetchResult<T> = { status: 'fresh'; payload: T; etag?: string } | { status: 'unchanged' };

/**
 * Public surface the route handlers consume. Owns the {@link LibraryCache}
 * privately and is responsible for: (1) HTTP — talking to the CDN with
 * retries + ETags; (2) freshness — deciding when to refresh based on the
 * cache's TTL; (3) orchestration — single-flight, stale-while-revalidate.
 *
 * The cache itself is a passive state holder. The fetcher reads from it
 * (`isFresh`, `catalog`, `versionId`, `getBody`) and writes to it
 * (`setCatalog`, `setVersionId`, `setBody`, `markRefreshSuccess`,
 * `markRefreshFailure`).
 *
 * Errors are wrapped in {@link LibraryFetchError} with a typed `reason` so
 * route handlers can branch without inspecting messages.
 */
export class LibraryFetcher extends LibrarySource {
  private readonly etags = new Map<string, string>();
  private refreshing?: Promise<void>;

  constructor(private readonly deps: LibraryFetcherDeps) {
    super(new LibraryCache(deps.ttlMs, 'http'));
  }

  async listTemplates(): Promise<Template[]> {
    const catalog = await this.getCatalog();
    return catalog.templates;
  }

  async getTemplate(slug: string): Promise<TemplateBody> {
    return this.loadTemplateBody(slug, true);
  }

  /**
   * Resolves a template body from the catalog row, verifying its content hash.
   *
   * A body URL is not immutable — a template can be re-published at the same
   * `<slug>/<version>.yaml` path (version only bumps for breaking changes across
   * Kibana versions). Because the catalog is TTL-cached and the body is fetched
   * separately, a cached catalog row can briefly predate a re-published body,
   * making the hash check fail on an otherwise-valid body. On that specific
   * failure we force one catalog refresh (which re-points/re-hashes the row and
   * drops the body cache) and retry; only a mismatch that survives a fresh
   * catalog is treated as genuine corruption.
   */
  private async loadTemplateBody(
    slug: string,
    retryOnIntegrityMismatch: boolean
  ): Promise<TemplateBody> {
    const catalog = await this.getCatalog();
    const row = catalog.templates.find((t) => t.slug === slug);
    if (!row) {
      throw new LibraryNotFoundError(slug);
    }
    const cached = this.cache.getBody(slug);
    if (cached) return cached;
    try {
      const body = await this.fetchTemplateBody(row);
      this.cache.setBody(slug, body);
      return body;
    } catch (err) {
      if (
        retryOnIntegrityMismatch &&
        err instanceof LibraryFetchError &&
        err.reason === 'integrity'
      ) {
        await this.refresh();
        return this.loadTemplateBody(slug, false);
      }
      throw err;
    }
  }

  private async getCatalog(): Promise<TemplatesCatalog> {
    await this.ensureFresh();
    if (!this.cache.catalog) {
      // Defensive: ensureFresh either loaded a catalog or threw.
      throw new LibraryFetchError(
        'Workflow Template Library catalog could not be loaded.',
        'unavailable'
      );
    }
    return this.cache.catalog;
  }

  private ensureFresh(): Promise<void> {
    if (this.cache.isFresh()) return Promise.resolve();
    return this.refresh();
  }

  /**
   * Refresh the catalog now, ignoring the TTL. Shares the single-flight guard
   * with {@link ensureFresh} so concurrent callers coalesce onto one refresh.
   */
  private refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.runRefresh().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private async runRefresh(): Promise<void> {
    try {
      const manifestResult = await this.fetchKibanaVersionsManifest();
      let versionId = this.cache.versionId;
      if (manifestResult.status === 'fresh') {
        versionId = resolveVersionId(
          this.deps.kibanaVersion,
          this.deps.isServerless,
          manifestResult.payload
        );
        this.cache.setVersionId(versionId);
      }
      if (!versionId) {
        // Pathological: a 304 manifest with no cached versionId. Bail to retry next read.
        return;
      }

      const catalogResult = await this.fetchTemplatesCatalog(versionId);
      if (catalogResult.status === 'fresh') {
        this.cache.setCatalog(catalogResult.payload);
      }

      this.cache.markRefreshSuccess();
    } catch (err) {
      this.cache.markRefreshFailure(err);
      this.deps.logger.warn(
        `Workflows library refresh failed: ${err instanceof Error ? err.message : String(err)}`
      );
      // Stale-while-revalidate: only propagate when there is no prior catalog
      // to serve. Once we have one, refresh failures are non-fatal.
      if (!this.cache.catalog) throw err;
    }
  }

  private async fetchKibanaVersionsManifest(): Promise<FetchResult<KibanaVersionsManifest>> {
    const url = this.buildUrl('kibana-versions.json');
    // Lenient schema: tolerate unknown fields from a newer catalog.
    return this.fetchJson<KibanaVersionsManifest>(url, KibanaVersionsManifestLenientSchema);
  }

  private async fetchTemplatesCatalog(versionId: string): Promise<FetchResult<TemplatesCatalog>> {
    const url = this.buildUrl(`${encodeURIComponent(versionId)}/catalogs/templates.json`);
    // Lenient schema: tolerate unknown fields from a newer catalog.
    return this.fetchJson<TemplatesCatalog>(url, TemplatesCatalogLenientSchema);
  }

  /**
   * Fetches a template body YAML and returns the parsed shape. No body-level
   * ETag is needed: body freshness is driven by the catalog — a re-published
   * body changes its row's `contentHash`, which busts the catalog's ETag and
   * clears the body cache on the next refresh. The fetched bytes are
   * integrity-checked against that `contentHash` before parsing, so a body that
   * does not match the row it was listed under is rejected rather than returned.
   */
  private async fetchTemplateBody(row: Template): Promise<TemplateBody> {
    const url = this.buildUrl(row.definitionUrl);
    const text = await this.fetchText(url);
    this.assertContentHashMatches(row, text, url);
    try {
      // Passthrough: keep the typed metadata, the full parsed workflow body, and
      // the raw YAML. No field enumeration so nothing is silently dropped.
      // `lenient` strips unknown `template-metadata` fields instead of rejecting
      // them, mirroring the catalog consumption schemas so a newer publisher
      // field doesn't 503 a template the catalog already lists (forward-compat).
      const { metadata, body, raw } = parseTemplateYaml(text, { lenient: true });
      return { metadata, body, raw };
    } catch (err) {
      if (err instanceof TemplateParseError) {
        throw new LibraryFetchError(
          `Failed to parse template body at ${url}: ${err.message}`,
          'malformed',
          url,
          undefined,
          err
        );
      }
      throw err;
    }
  }

  private buildUrl(path: string): string {
    const base = this.deps.registryUrl?.replace(/\/+$/, '') ?? DEFAULT_LIBRARY_REGISTRY_URL;
    const suffix = path.replace(/^\/+/, '');
    return `${base}/${suffix}`;
  }

  private async fetchJson<T>(
    url: string,
    schema: { parse: (input: unknown) => T }
  ): Promise<FetchResult<T>> {
    const result = await this.requestWithRetry(url, {
      maxBytes: this.deps.maxCatalogBytes ?? LibrarySource.MAX_CATALOG_BYTES,
    });
    if (result.status === 'unchanged') {
      return { status: 'unchanged' };
    }
    let json: unknown;
    try {
      json = JSON.parse(result.body);
    } catch (err) {
      throw new LibraryFetchError(
        `Upstream response at ${url} was not valid JSON.`,
        'malformed',
        url,
        undefined,
        err
      );
    }
    let payload: T;
    try {
      payload = schema.parse(json);
    } catch (err) {
      throw new LibraryFetchError(
        `Upstream response at ${url} failed schema validation${
          err instanceof ZodError ? `: ${formatZodIssues(err)}` : '.'
        }`,
        'malformed',
        url,
        undefined,
        err
      );
    }
    return { status: 'fresh', payload, etag: result.etag };
  }

  private async fetchText(url: string): Promise<string> {
    const result = await this.requestWithRetry(url, {
      useEtag: false,
      maxBytes: this.deps.maxBodyBytes ?? LibrarySource.MAX_BODY_BYTES,
    });
    if (result.status === 'unchanged') {
      // Defensive: with useEtag=false this branch is unreachable.
      throw new LibraryFetchError(`Unexpected 304 from ${url}.`, 'http-error', url, 304);
    }
    return result.body;
  }

  /**
   * Internal HTTP wrapper with ETag handling and bounded retries on transient
   * upstream / network errors. Returns either the fresh response body (+ ETag)
   * or the `'unchanged'` sentinel.
   */
  private async requestWithRetry(
    url: string,
    options: { useEtag?: boolean; maxBytes?: number } = {}
  ): Promise<{ status: 'fresh'; body: string; etag?: string } | { status: 'unchanged' }> {
    const { useEtag = true, maxBytes } = options;
    const { logger } = this.deps;
    const previousEtag = useEtag ? this.etags.get(url) : undefined;
    const timeoutMs = this.deps.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

    const init: RequestInit = {
      // Per-attempt timeout: node-fetch rejects with a `request-timeout`
      // FetchError once exceeded. Applied to every retry, not the whole call.
      timeout: timeoutMs,
      // Cap the buffered response; node-fetch rejects with a `max-size`
      // FetchError once exceeded (0 would disable the limit).
      ...(maxBytes ? { size: maxBytes } : {}),
      headers: {
        'User-Agent': `Kibana/${this.deps.kibanaVersion} workflows-library`,
        ...(previousEtag ? { 'If-None-Match': previousEtag } : {}),
      },
    };

    try {
      const response = await pRetry(() => doRequest(url, init), {
        ...DEFAULT_RETRY_OPTIONS,
        ...this.deps.retryOptions,
        onFailedAttempt: (err) => {
          logger.warn(
            `Workflows library: request to ${url} failed (attempt ${err.attemptNumber}/${
              err.attemptNumber + err.retriesLeft
            }): ${err.message}`
          );
        },
      });

      if (response.status === 304) {
        return { status: 'unchanged' };
      }

      const etag = response.headers.get('etag') ?? undefined;
      if (useEtag && etag) {
        this.etags.set(url, etag);
      }
      const body = await response.text();
      return { status: 'fresh', body, etag };
    } catch (err) {
      if (err instanceof LibraryFetchError) throw err;
      if (isFetchMaxSizeError(err)) {
        throw new LibraryFetchError(
          `Response from ${url} exceeded the maximum allowed size of ${maxBytes} bytes.`,
          'too-large',
          url,
          undefined,
          err
        );
      }
      if (isFetchTimeoutError(err)) {
        throw new LibraryFetchError(
          `Request to ${url} timed out after ${timeoutMs}ms.`,
          'timeout',
          url,
          undefined,
          err
        );
      }
      if (isFetchSystemError(err)) {
        throw new LibraryFetchError(
          `Failed to reach ${url}: ${err.message}`,
          'connection',
          url,
          undefined,
          err
        );
      }
      throw new LibraryFetchError(
        `Unexpected error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
        'connection',
        url,
        undefined,
        err
      );
    }
  }
}

async function doRequest(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status === 304 || response.ok) {
    return response;
  }
  const error = new LibraryFetchError(
    `Upstream ${response.status} ${response.statusText || ''} at ${url}`.trim(),
    'http-error',
    url,
    response.status
  );
  // 4xx: do not retry. 5xx: let p-retry retry.
  if (response.status >= 500) {
    throw error;
  }
  throw new AbortError(error);
}

function isFetchSystemError(err: unknown): err is FetchError {
  return (
    (err instanceof FetchError || (err as { name?: string })?.name === 'FetchError') &&
    (err as FetchError).type === 'system'
  );
}

function isFetchTimeoutError(err: unknown): err is FetchError {
  return (
    (err instanceof FetchError || (err as { name?: string })?.name === 'FetchError') &&
    (err as FetchError).type === 'request-timeout'
  );
}

function isFetchMaxSizeError(err: unknown): err is FetchError {
  return (
    (err instanceof FetchError || (err as { name?: string })?.name === 'FetchError') &&
    (err as FetchError).type === 'max-size'
  );
}

function formatZodIssues(err: ZodError): string {
  return err.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
