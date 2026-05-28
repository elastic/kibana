import type {
  BulkCreateMcpToolsRequest,
  KibanaClient,
  ListToolsResponse,
  ListToolsResponseItem,
  Mem2ActSample,
  Mem2ActToolSchema,
} from '@memory-evals/shared';
import { log, warn } from '@memory-evals/shared';

export interface RegisterToolsOptions {
  client: KibanaClient;
  connectorId: string;
  namespace: string;
  /** Tag added to every registered tool so cleanup can target this run. */
  runTag: string;
  /** Tools as captured across all samples (deduplicated by name). */
  tools: Mem2ActToolSchema[];
}

export interface RegisterToolsResult {
  registered: string[];
  skipped: string[];
  failed: Array<{ name: string; reason: string }>;
}

/**
 * Registers each unique tool schema against the configured MCP connector.
 * Uses `skip_existing: true` so re-runs are idempotent.
 *
 * The tool-call scorer compares by name (and tolerates namespace prefixes),
 * so the actual registered id can be either `<namespace>.<name>` or `<name>`
 * depending on Kibana version.
 */
export const registerMem2ActTools = async (
  opts: RegisterToolsOptions
): Promise<RegisterToolsResult> => {
  if (opts.tools.length === 0) return { registered: [], skipped: [], failed: [] };
  const body: BulkCreateMcpToolsRequest = {
    connector_id: opts.connectorId,
    namespace: opts.namespace,
    tags: ['mem2act-eval', opts.runTag],
    skip_existing: true,
    tools: opts.tools.map((t) => ({
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
    })),
  };
  const res = await opts.client.bulkCreateMcpTools(body);
  const registered: string[] = [];
  const skipped: string[] = [];
  const failed: RegisterToolsResult['failed'] = [];
  for (const r of res.results ?? []) {
    if (r.success) {
      registered.push(r.toolId ?? r.name ?? '');
    } else {
      const reason = r.reason?.error?.message ?? 'unknown';
      if (/already exists/i.test(reason) || /skipped/i.test(reason)) {
        skipped.push(r.name ?? r.toolId ?? '');
      } else {
        failed.push({ name: r.name ?? r.toolId ?? '?', reason });
      }
    }
  }
  log(
    `  tool registration: registered=${registered.length} skipped=${skipped.length} failed=${failed.length}`
  );
  if (failed.length > 0) {
    for (const f of failed) warn(`    failed to register "${f.name}": ${f.reason}`);
  }
  return { registered, skipped, failed };
};

/** Aggregate unique tool schemas across a list of samples. */
export const collectUniqueTools = (samples: Mem2ActSample[]): Mem2ActToolSchema[] => {
  const seen = new Map<string, Mem2ActToolSchema>();
  for (const s of samples) {
    for (const t of s.tool_schemas ?? []) {
      if (!seen.has(t.name)) seen.set(t.name, t);
    }
  }
  return [...seen.values()];
};

/**
 * Tear down tools registered under the given namespace + run tag. Best-effort —
 * we ignore failures so the runner exits cleanly even when the MCP connector
 * is misbehaving.
 */
export const teardownMem2ActTools = async (
  client: KibanaClient,
  namespace: string,
  runTag: string
): Promise<{ deleted: number; matched: number }> => {
  let items: ListToolsResponseItem[] = [];
  try {
    const raw = await client.listTools();
    items = normalizeToolList(raw);
  } catch (e) {
    warn(`listTools failed during teardown: ${(e as Error).message}`);
    return { deleted: 0, matched: 0 };
  }
  const candidates = items.filter((t) => {
    if (t.namespace && t.namespace !== namespace) return false;
    if (t.id && t.id.startsWith(`${namespace}.`)) return true;
    if (t.tags && t.tags.includes(runTag)) return true;
    return false;
  });
  if (candidates.length === 0) return { deleted: 0, matched: 0 };
  const ids = candidates.map((c) => c.id);
  try {
    const res = await client.bulkDeleteTools({ ids, force: true });
    const deleted = res.results?.filter((r) => r.success).length ?? 0;
    return { deleted, matched: ids.length };
  } catch (e) {
    warn(`bulkDeleteTools failed during teardown: ${(e as Error).message}`);
    return { deleted: 0, matched: ids.length };
  }
};

const normalizeToolList = (raw: ListToolsResponse): ListToolsResponseItem[] => {
  if (Array.isArray(raw)) return raw;
  if ('results' in raw && Array.isArray(raw.results)) return raw.results;
  if ('tools' in raw && Array.isArray(raw.tools)) return raw.tools;
  return [];
};
