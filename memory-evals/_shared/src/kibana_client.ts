import { setTimeout as delay } from 'node:timers/promises';

import type {
  BulkCreateMcpToolsRequest,
  BulkCreateMcpToolsResponse,
  BulkDeleteRequest,
  BulkDeleteResponse,
  BulkDeleteToolsRequest,
  BulkDeleteToolsResponse,
  ConverseRequest,
  ConverseResponse,
  ImportConversationRequest,
  ImportConversationResponse,
  ListToolsResponse,
} from './types.js';

/**
 * Configuration accepted by {@link KibanaClient}. Most fields are read from
 * env vars by {@link parseEnv} in `env.ts`, but the constructor is left bare
 * so tests can pass an explicit `fetch` impl (e.g. undici `MockAgent`).
 */
export interface KibanaClientOptions {
  url: string;
  /** Pre-encoded API key (preferred). */
  apiKey?: string;
  /** Basic auth fallback. */
  username?: string;
  password?: string;
  /** Override base path; otherwise auto-detected on first use. */
  basePath?: string;
  /** Space id, forwarded as `x-kbn-space`. */
  space?: string;
  /** Custom fetch impl. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Memory team's extract endpoint. If unset, {@link KibanaClient.triggerMemoryExtract}
   * is a no-op.
   */
  memoryExtractUrl?: string;
  /** Max retry attempts on 5xx/429 (default 4). */
  maxRetries?: number;
  /** Base retry delay in ms (default 500). */
  retryBaseMs?: number;
  /** Verbose request logging. */
  verbose?: boolean;
}

export class KibanaApiError extends Error {
  override readonly name = 'KibanaApiError';

  constructor(
    readonly status: number,
    readonly path: string,
    readonly bodyText: string,
    readonly body?: unknown
  ) {
    const summary =
      body && typeof body === 'object' && 'message' in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).message)
        : bodyText.slice(0, 200);
    super(`Kibana ${status} ${path}: ${summary}`);
  }
}

const PUBLIC = '/api/agent_builder';
const INTERNAL = '/internal/agent_builder';

const sanitize = (path: string): string => (path.startsWith('/') ? path : `/${path}`);

const stripTrailingSlash = (s: string): string => (s.endsWith('/') ? s.slice(0, -1) : s);

const isRetriable = (status: number): boolean => status === 429 || (status >= 500 && status < 600);

export class KibanaClient {
  private readonly url: string;
  private readonly fetchImpl: typeof fetch;
  private readonly authHeader: string | undefined;
  private readonly space: string | undefined;
  private readonly memoryExtractUrl: string | undefined;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly verbose: boolean;

  private basePathOverride: string | undefined;
  private basePathPromise: Promise<string> | undefined;
  private memoryExtractLogged = false;

  constructor(opts: KibanaClientOptions) {
    if (!opts.url) throw new Error('KibanaClient: `url` is required');
    this.url = stripTrailingSlash(opts.url);
    this.fetchImpl = opts.fetch ?? fetch;
    this.authHeader = buildAuthHeader(opts);
    this.space = opts.space;
    this.memoryExtractUrl = opts.memoryExtractUrl;
    this.maxRetries = opts.maxRetries ?? 4;
    this.retryBaseMs = opts.retryBaseMs ?? 500;
    this.verbose = !!opts.verbose;
    this.basePathOverride =
      opts.basePath !== undefined ? stripTrailingSlash(opts.basePath) : undefined;
  }

  /**
   * Best-effort base path detection. Follows the redirect issued by `GET /`,
   * extracting the leading path segment if present.
   *
   * Cached for the lifetime of the client.
   */
  async getBasePath(): Promise<string> {
    if (this.basePathOverride !== undefined) return this.basePathOverride;
    if (!this.basePathPromise) {
      this.basePathPromise = this.detectBasePath().catch((err) => {
        this.basePathPromise = undefined;
        throw err;
      });
    }
    return this.basePathPromise;
  }

  private async detectBasePath(): Promise<string> {
    try {
      const res = await this.fetchImpl(`${this.url}/`, {
        method: 'GET',
        redirect: 'manual',
        headers: this.baseHeaders(),
      });
      const loc = res.headers.get('location');
      if (loc) {
        try {
          const url = new URL(loc, this.url);
          const segments = url.pathname.split('/').filter(Boolean);
          // Kibana redirects to `/<basePath>/login` or `/<basePath>/spaces/...`.
          // Exclude well-known root segments that are NOT base paths.
          const RESERVED = new Set(['app', 'login', 'logout', 's', 'spaces', 'api', 'internal']);
          if (segments.length > 0 && !RESERVED.has(segments[0] ?? '')) {
            return `/${segments[0]}`;
          }
        } catch {
          // ignore — fall through to empty base path
        }
      }
      return '';
    } catch (err) {
      if (this.verbose) {
        process.stderr.write(
          `[kibana_client] base-path detection failed (${(err as Error).message}); assuming '/'\n`
        );
      }
      return '';
    }
  }

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------

  /** POST `/internal/agent_builder/conversations/_import`. */
  async importConversation(req: ImportConversationRequest): Promise<ImportConversationResponse> {
    return this.request<ImportConversationResponse>(
      'POST',
      `${INTERNAL}/conversations/_import`,
      req
    );
  }

  /** POST `/internal/agent_builder/conversations/_bulk_delete`. */
  async bulkDeleteConversations(req: BulkDeleteRequest): Promise<BulkDeleteResponse> {
    return this.request<BulkDeleteResponse>(
      'POST',
      `${INTERNAL}/conversations/_bulk_delete`,
      req
    );
  }

  // -------------------------------------------------------------------------
  // Chat / converse
  // -------------------------------------------------------------------------

  /** POST `/api/agent_builder/converse`. */
  async converse(req: ConverseRequest): Promise<ConverseResponse> {
    return this.request<ConverseResponse>('POST', `${PUBLIC}/converse`, req);
  }

  // -------------------------------------------------------------------------
  // Tools (Mem2Act)
  // -------------------------------------------------------------------------

  /**
   * POST `/internal/agent_builder/tools/_bulk_create_mcp`. Registers tool
   * stubs against an existing MCP connector. The connector must already be
   * configured in Kibana — this endpoint only attaches tool metadata.
   */
  async bulkCreateMcpTools(req: BulkCreateMcpToolsRequest): Promise<BulkCreateMcpToolsResponse> {
    return this.request<BulkCreateMcpToolsResponse>(
      'POST',
      `${INTERNAL}/tools/_bulk_create_mcp`,
      req
    );
  }

  /** POST `/internal/agent_builder/tools/_bulk_delete`. Forces by default. */
  async bulkDeleteTools(req: BulkDeleteToolsRequest): Promise<BulkDeleteToolsResponse> {
    return this.request<BulkDeleteToolsResponse>('POST', `${INTERNAL}/tools/_bulk_delete`, req);
  }

  /** GET `/api/agent_builder/tools`. Used to find tool ids for cleanup. */
  async listTools(): Promise<ListToolsResponse> {
    return this.request<ListToolsResponse>('GET', `${PUBLIC}/tools`);
  }

  // -------------------------------------------------------------------------
  // Memory team hook
  // -------------------------------------------------------------------------

  /**
   * POSTs to `KBN_MEMORY_EXTRACT_URL` if set. A no-op otherwise (logged once).
   *
   * The contract is intentionally narrow:
   *
   * ```http
   * POST <url>
   * { conversation_id, agent_id?, started_at? }
   * ```
   *
   * Any 2xx response is treated as success.
   */
  async triggerMemoryExtract(input: {
    conversation_id: string;
    agent_id?: string;
    started_at?: string;
  }): Promise<void> {
    if (!this.memoryExtractUrl) {
      if (!this.memoryExtractLogged) {
        this.memoryExtractLogged = true;
        if (this.verbose) {
          process.stderr.write(
            '[kibana_client] KBN_MEMORY_EXTRACT_URL is unset — memory extraction is a no-op.\n'
          );
        }
      }
      return;
    }

    const res = await this.retrying(() =>
      this.fetchImpl(this.memoryExtractUrl!, {
        method: 'POST',
        headers: this.jsonHeaders(),
        body: JSON.stringify(input),
      })
    );
    if (!res.ok) {
      const text = await safeReadText(res);
      throw new KibanaApiError(res.status, this.memoryExtractUrl, text, safeParseJson(text));
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const basePath = await this.getBasePath();
    const full = `${this.url}${basePath}${sanitize(path)}`;

    const res = await this.retrying(() =>
      this.fetchImpl(full, {
        method,
        headers: this.jsonHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    );

    const text = await safeReadText(res);
    const json = safeParseJson(text);
    if (!res.ok) {
      throw new KibanaApiError(res.status, full, text, json);
    }
    return (json ?? {}) as T;
  }

  private async retrying(fn: () => Promise<Response>): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fn();
        if (!isRetriable(res.status) || attempt === this.maxRetries) return res;
        if (this.verbose) {
          process.stderr.write(
            `[kibana_client] retriable status ${res.status} (attempt ${attempt + 1}/${this.maxRetries})\n`
          );
        }
        await delay(this.backoffMs(attempt));
      } catch (err) {
        lastErr = err;
        if (attempt === this.maxRetries) throw err;
        if (this.verbose) {
          process.stderr.write(
            `[kibana_client] fetch error (attempt ${attempt + 1}/${this.maxRetries}): ${(err as Error).message}\n`
          );
        }
        await delay(this.backoffMs(attempt));
      }
    }
    // unreachable
    throw lastErr instanceof Error ? lastErr : new Error('retry loop exhausted');
  }

  private backoffMs(attempt: number): number {
    const jitter = Math.floor(Math.random() * 100);
    return this.retryBaseMs * Math.pow(2, attempt) + jitter;
  }

  private baseHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'kbn-xsrf': 'report-it' };
    if (this.authHeader) h.authorization = this.authHeader;
    if (this.space) h['x-kbn-space'] = this.space;
    return h;
  }

  private jsonHeaders(): Record<string, string> {
    return { ...this.baseHeaders(), 'content-type': 'application/json', accept: 'application/json' };
  }
}

function buildAuthHeader(opts: KibanaClientOptions): string | undefined {
  if (opts.apiKey) return `ApiKey ${opts.apiKey}`;
  if (opts.username && opts.password) {
    const token = Buffer.from(`${opts.username}:${opts.password}`).toString('base64');
    return `Basic ${token}`;
  }
  return undefined;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function safeParseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
