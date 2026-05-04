/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Heap snapshot analyzer — computes retained heap by package using a
// dominator-tree analysis of a V8 .heapsnapshot file.
//
// Usage:
//   node --max-old-space-size=8192 scripts/heap_snapshot_analyzer.ts <snapshot> [--json [file]]
//
// Default output is a human-readable report on stdout. Pass `--json` to emit
// JSON to stdout, or `--json <file>` to write JSON to a file. Status lines
// always go to stderr so JSON output stays clean.
//
// Loads the snapshot as a Buffer (no V8 ~512MB string limit) and parses the
// known top-level structure incrementally so multi-GB snapshots work.

import { readFileSync, writeFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

// Byte constants — keep parser hot loops free of String comparisons.
const C_LBRACE = 0x7b; // {
const C_RBRACE = 0x7d; // }
const C_LBRACKET = 0x5b; // [
const C_RBRACKET = 0x5d; // ]
const C_QUOTE = 0x22; // "
const C_BACKSLASH = 0x5c; // \
const C_COLON = 0x3a; // :
const C_COMMA = 0x2c; // ,
const C_MINUS = 0x2d; // -
const C_DOT = 0x2e; // .
const C_PLUS = 0x2b; // +
const C_E = 0x65; // e
const C_E_UPPER = 0x45; // E
const C_0 = 0x30;
const C_9 = 0x39;
const C_SPACE = 0x20;
const C_TAB = 0x09;
const C_LF = 0x0a;
const C_CR = 0x0d;

interface SnapshotMeta {
  node_fields: string[];
  edge_fields: string[];
  node_types: [string[], ...unknown[]];
  edge_types: [string[], ...unknown[]];
  trace_function_info_fields?: string[];
  trace_node_fields?: string[];
}

interface SnapshotHeader {
  meta: SnapshotMeta;
  node_count: number;
  edge_count: number;
}

interface TraceData {
  // Parallel arrays indexed by internal trace node index (0 = root).
  parents: Int32Array;
  fnInfo: Int32Array;
  // V8 trace_node_id (as referenced by heap nodes) → internal index.
  idToIdx: Map<number, number>;
}

interface ParsedSnapshot {
  snapshot: SnapshotHeader;
  nodes: Float64Array;
  edges: Float64Array;
  strings: string[];
  // Present when the snapshot was captured with allocation tracking enabled.
  traceFunctionInfos?: Float64Array;
  traceData?: TraceData;
}

interface PackageRow {
  package: string;
  retainedPct: number;
  savedPct: number;
  retainedBytes: number;
  savedBytes: number;
}

interface PackageAllocRow {
  package: string;
  allocPct: number;
  allocBytes: number;
}

interface PluginRow {
  plugin: string;
  retainedPct: number;
  savedPct: number;
  allocPct: number; // 0 if snapshot has no allocation tracking data
  retainedBytes: number;
  savedBytes: number;
  allocBytes: number;
}

interface NodeTypeRow {
  type: string;
  self: number;
  selfPct: number;
  count: number;
  retainedBoundary: number;
}

interface JsonReport {
  totalSelf: number;
  rootRetained: number;
  nodeCount: number;
  edgeCount: number;
  pluginCount: number;
  hasAllocationTracking: boolean;
  filter?: string;
  packages: PackageRow[];
  plugins: PluginRow[];
  modulesAlloc?: PackageAllocRow[];
  packagesAlloc?: PackageAllocRow[];
  unattributed: {
    package: { retainedBytes: number; pct: number };
    plugins: { retainedBytes: number; pct: number };
    allocSite?: { retainedBytes: number; pct: number };
    allocSiteUntracked?: { retainedBytes: number; pct: number };
    allocSiteModule?: { retainedBytes: number; pct: number };
    allocSitePackage?: { retainedBytes: number; pct: number };
  };
  nodeTypes: NodeTypeRow[];
}

const KBN_RE = /@kbn\/[a-z0-9_-]+/;
const NM_RE = /node_modules\/(@[^/]+\/[^/]+|[^/]+)/;

export function runHeapSnapshotAnalyzerCli(): void {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));

  function flagValue(name: string): string | undefined {
    // Supports both `--name=value` and `--name value`.
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === `--${name}`) {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('--')) return next;
        return '';
      }
      if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
    }
    return undefined;
  }

  const hasFlag = (name: string) => flagValue(name) !== undefined;

  const jsonMode = hasFlag('json');
  const jsonFileArg = flagValue('json');
  const jsonFile = jsonFileArg && jsonFileArg.length > 0 ? jsonFileArg : undefined;

  // Counterfactual shrinkage runs by default — the gap vs attributed-retained is
  // the actually interesting signal (leaf vs load-bearing packages). Disable
  // with --no-counterfactual; tune scope with --counterfactual=N.
  const counterfactualMode = !hasFlag('no-counterfactual');
  const counterfactualTopN = (() => {
    const v = flagValue('counterfactual');
    if (v === undefined || v.length === 0) return 30;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) {
      process.stderr.write(`Invalid --counterfactual value '${v}'.\n`);
      process.exit(1);
    }
    return n;
  })();

  if (positional.length === 0) {
    process.stderr.write(
      'Usage: node --max-old-space-size=8192 scripts/heap_snapshot_analyzer.ts <snapshot> [flags]\n' +
        '\n' +
        'Flags:\n' +
        '  --json [file]            Emit JSON report to stdout, or write to <file>.\n' +
        '  --counterfactual=N       Top-N packages/plugins for counterfactual shrinkage\n' +
        '                           analysis (default 30).\n' +
        '  --no-counterfactual      Skip counterfactual shrinkage (faster, less info).\n' +
        '  --filter=<regex>         Restrict allocation-site tables to nodes whose deepest\n' +
        '                           allocation frame script_name matches <regex>. Example:\n' +
        '                           --filter=zod for Zod-only allocation attribution.\n' +
        '\n' +
        'Computes two attribution views by default:\n' +
        '  - package: explicit-evidence seeds + dominator propagation (per-package; edge-order invariant)\n' +
        '  - plugins: same but only seeds plugin-typed packages (rolls up to product domain / owning team)\n'
    );
    process.exit(1);
  }

  const snapshotPath = positional[0];

  const filterStr = flagValue('filter');
  let filterRegex: RegExp | undefined;
  if (filterStr !== undefined) {
    if (filterStr.length === 0) {
      process.stderr.write(`--filter requires a value, e.g. --filter=zod\n`);
      process.exit(1);
    }
    try {
      filterRegex = new RegExp(filterStr);
    } catch (err) {
      process.stderr.write(`Invalid --filter regex '${filterStr}': ${(err as Error).message}\n`);
      process.exit(1);
    }
  }

  function status(msg: string): void {
    process.stderr.write(msg + '\n');
  }

  function elapsed(start: number): string {
    return `${((Date.now() - start) / 1000).toFixed(1)}s`;
  }

  function extractPkg(name: string): string | undefined {
    const k = KBN_RE.exec(name);
    if (k) return k[0];
    const n = NM_RE.exec(name);
    if (n) return n[1];
    return undefined;
  }

  function fieldIndex(fields: string[], name: string): number {
    const i = fields.indexOf(name);
    if (i === -1) throw new Error(`Field '${name}' not found`);
    return i;
  }

  function truncate(s: string, max: number): string {
    return s.length <= max ? s : s.slice(0, max);
  }

  function pad(s: string, width: number, right = false): string {
    if (s.length >= width) return s;
    const fill = ' '.repeat(width - s.length);
    return right ? fill + s : s + fill;
  }

  function fmtBytes(b: number, unit: 'KB' | 'MB' = 'MB'): string {
    const div = unit === 'MB' ? 1e6 : 1e3;
    return `${(b / div).toFixed(1)} ${unit}`;
  }

  // --- Streaming parser tailored to the V8 heap-snapshot top-level shape ---
  //
  //   {
  //     "snapshot": { "meta": {...}, "node_count": N, "edge_count": E, ... },
  //     "nodes":    [ ...N*nf integers... ],
  //     "edges":    [ ...E*ef integers... ],
  //     "trace_function_infos": [...],
  //     "trace_tree":           [...],
  //     "samples":              [...],
  //     "locations":            [...],
  //     "strings":  [ "...", "...", ... ]
  //   }
  //
  // We walk the Buffer with an integer cursor — never materializing the whole
  // file as a JS string — and only convert the slices we actually need.

  function skipWs(buf: Buffer, pos: number): number {
    while (pos < buf.length) {
      const c = buf[pos];
      if (c === C_SPACE || c === C_TAB || c === C_LF || c === C_CR) pos++;
      else break;
    }
    return pos;
  }

  function expect(buf: Buffer, pos: number, byte: number, label: string): void {
    if (buf[pos] !== byte) {
      throw new Error(
        `Parse error at byte ${pos}: expected ${label} (0x${byte.toString(16)}), got 0x${buf[
          pos
        ]?.toString(16)}`
      );
    }
  }

  // Find the matching '}' for a '{' at startPos. Tracks nesting and skips strings.
  function findMatchingBrace(buf: Buffer, startPos: number): number {
    if (buf[startPos] !== C_LBRACE) throw new Error(`Expected '{' at ${startPos}`);
    let depth = 0;
    let pos = startPos;
    while (pos < buf.length) {
      const c = buf[pos];
      if (c === C_LBRACE) depth++;
      else if (c === C_RBRACE) {
        depth--;
        if (depth === 0) return pos;
      } else if (c === C_QUOTE) {
        // Skip JSON string
        pos++;
        while (pos < buf.length) {
          const cc = buf[pos];
          if (cc === C_BACKSLASH) {
            pos += 2;
            continue;
          }
          if (cc === C_QUOTE) break;
          pos++;
        }
      }
      pos++;
    }
    throw new Error('Unterminated object');
  }

  // Read a simple key string at pos (no escapes expected in object keys).
  function readKey(buf: Buffer, pos: number): { key: string; pos: number } {
    expect(buf, pos, C_QUOTE, '"');
    const start = pos + 1;
    let p = start;
    while (p < buf.length && buf[p] !== C_QUOTE) p++;
    return { key: buf.toString('utf-8', start, p), pos: p + 1 };
  }

  // Skip an arbitrary JSON value at pos. Used for sections we don't need
  // (trace_function_infos, trace_tree, samples, etc.).
  function skipValue(buf: Buffer, pos: number): number {
    pos = skipWs(buf, pos);
    const c = buf[pos];
    if (c === C_LBRACE) {
      return findMatchingBrace(buf, pos) + 1;
    }
    if (c === C_LBRACKET) {
      let depth = 0;
      let p = pos;
      while (p < buf.length) {
        const cc = buf[p];
        if (cc === C_LBRACKET) depth++;
        else if (cc === C_RBRACKET) {
          depth--;
          if (depth === 0) return p + 1;
        } else if (cc === C_QUOTE) {
          p++;
          while (p < buf.length) {
            const ccc = buf[p];
            if (ccc === C_BACKSLASH) {
              p += 2;
              continue;
            }
            if (ccc === C_QUOTE) break;
            p++;
          }
        }
        p++;
      }
      throw new Error('Unterminated array');
    }
    if (c === C_QUOTE) {
      let p = pos + 1;
      while (p < buf.length) {
        const cc = buf[p];
        if (cc === C_BACKSLASH) {
          p += 2;
          continue;
        }
        if (cc === C_QUOTE) return p + 1;
        p++;
      }
      throw new Error('Unterminated string');
    }
    // Number / true / false / null
    while (pos < buf.length) {
      const cc = buf[pos];
      if (
        cc === C_COMMA ||
        cc === C_RBRACE ||
        cc === C_RBRACKET ||
        cc === C_SPACE ||
        cc === C_TAB ||
        cc === C_LF ||
        cc === C_CR
      )
        break;
      pos++;
    }
    return pos;
  }

  // Parse a flat numeric array. Uses byte-level digit parsing — JSON.parse on
  // the whole array would create an enormous JS string and blow the heap.
  // `count` lets us pre-size a Float64Array; if omitted, we grow geometrically.
  function parseNumberArray(
    buf: Buffer,
    pos: number,
    count: number | undefined
  ): { values: Float64Array; endPos: number } {
    expect(buf, pos, C_LBRACKET, '[');
    pos++;
    pos = skipWs(buf, pos);
    if (buf[pos] === C_RBRACKET) {
      return { values: new Float64Array(0), endPos: pos + 1 };
    }

    let arr = count !== undefined ? new Float64Array(count) : new Float64Array(1024);
    let idx = 0;

    while (true) {
      // Read one number (signed integer or decimal/exponent).
      let val = 0;
      let neg = false;
      if (buf[pos] === C_MINUS) {
        neg = true;
        pos++;
      }
      const intStart = pos;
      while (pos < buf.length) {
        const c = buf[pos];
        if (c >= C_0 && c <= C_9) {
          val = val * 10 + (c - C_0);
          pos++;
        } else break;
      }
      // Fall back to JS parser for fractional / exponent forms (rare in heap data).
      if (buf[pos] === C_DOT || buf[pos] === C_E || buf[pos] === C_E_UPPER) {
        while (pos < buf.length) {
          const c = buf[pos];
          if (
            (c >= C_0 && c <= C_9) ||
            c === C_DOT ||
            c === C_E ||
            c === C_E_UPPER ||
            c === C_PLUS ||
            c === C_MINUS
          ) {
            pos++;
          } else break;
        }
        val = +buf.toString('latin1', neg ? intStart - 1 : intStart, pos);
      } else if (neg) {
        val = -val;
      }

      if (idx >= arr.length) {
        const next = new Float64Array(arr.length * 2);
        next.set(arr);
        arr = next;
      }
      arr[idx++] = val;

      pos = skipWs(buf, pos);
      const c = buf[pos];
      if (c === C_RBRACKET) {
        pos++;
        break;
      }
      if (c === C_COMMA) {
        pos++;
        pos = skipWs(buf, pos);
        continue;
      }
      throw new Error(`Expected ',' or ']' at byte ${pos}, got 0x${c?.toString(16)}`);
    }

    if (count !== undefined && idx !== count) {
      status(`  Warning: expected ${count} values, got ${idx}`);
    }
    // Trim if we over-allocated when growing dynamically.
    if (count === undefined && idx < arr.length) {
      arr = arr.slice(0, idx);
    } else if (count !== undefined && idx < count) {
      arr = arr.slice(0, idx);
    }
    return { values: arr, endPos: pos };
  }

  function parseStringArray(buf: Buffer, pos: number): { values: string[]; endPos: number } {
    expect(buf, pos, C_LBRACKET, '[');
    pos++;
    pos = skipWs(buf, pos);
    if (buf[pos] === C_RBRACKET) {
      return { values: [], endPos: pos + 1 };
    }

    const values: string[] = [];

    while (true) {
      expect(buf, pos, C_QUOTE, '"');
      const strStart = pos + 1;
      let p = strStart;
      let hasEscape = false;
      while (p < buf.length) {
        const c = buf[p];
        if (c === C_BACKSLASH) {
          hasEscape = true;
          p += 2;
          continue;
        }
        if (c === C_QUOTE) break;
        p++;
      }
      if (p >= buf.length) throw new Error('Unterminated string in strings array');
      if (!hasEscape) {
        values.push(buf.toString('utf-8', strStart, p));
      } else {
        // Re-parse via JSON to get correct escape handling for this one element.
        values.push(JSON.parse(buf.toString('utf-8', pos, p + 1)));
      }
      pos = p + 1;

      pos = skipWs(buf, pos);
      const c = buf[pos];
      if (c === C_RBRACKET) {
        pos++;
        break;
      }
      if (c === C_COMMA) {
        pos++;
        pos = skipWs(buf, pos);
        continue;
      }
      throw new Error(`Expected ',' or ']' in strings array at byte ${pos}`);
    }

    return { values, endPos: pos };
  }

  // Read a single signed integer at pos. Returns the value and end position.
  // Used by the trace_tree parser, which interleaves ints with nested arrays.
  function readInt(buf: Buffer, pos: number): { value: number; pos: number } {
    let neg = false;
    if (buf[pos] === C_MINUS) {
      neg = true;
      pos++;
    }
    let val = 0;
    let any = false;
    while (pos < buf.length) {
      const c = buf[pos];
      if (c >= C_0 && c <= C_9) {
        val = val * 10 + (c - C_0);
        pos++;
        any = true;
      } else break;
    }
    if (!any) throw new Error(`Expected digit at byte ${pos}, got 0x${buf[pos]?.toString(16)}`);
    return { value: neg ? -val : val, pos };
  }

  // Parse the trace_tree section.
  //
  // V8 emits each trace node as: id,fnInfoIdx,count,size,[children]
  // The outer trace_tree value is wrapped in []; the root node's id is 0.
  // Children are a flat sequence of (4 ints + 1 nested array) groups.
  function parseTraceTree(buf: Buffer, startPos: number): { traceData: TraceData; endPos: number } {
    expect(buf, startPos, C_LBRACKET, '[');
    let pos = startPos + 1;
    pos = skipWs(buf, pos);

    const parents: number[] = [];
    const fnInfo: number[] = [];
    const idToIdx = new Map<number, number>();

    if (buf[pos] === C_RBRACKET) {
      return {
        traceData: {
          parents: new Int32Array(0),
          fnInfo: new Int32Array(0),
          idToIdx,
        },
        endPos: pos + 1,
      };
    }

    // Iterative DFS: each frame remembers parent index + how many children remain.
    // The "current" position is the start of the next field/element to consume.
    const stack: number[] = []; // parent index for each open frame
    let parent = -1;

    // Begin the root node.
    while (true) {
      // Read 4 ints
      let r = readInt(buf, pos);
      const id = r.value;
      pos = skipWs(buf, r.pos);
      expect(buf, pos, C_COMMA, ',');
      pos = skipWs(buf, pos + 1);
      r = readInt(buf, pos);
      const fnIdx = r.value;
      pos = skipWs(buf, r.pos);
      expect(buf, pos, C_COMMA, ',');
      pos = skipWs(buf, pos + 1);
      r = readInt(buf, pos);
      pos = skipWs(buf, r.pos); // count, ignored
      expect(buf, pos, C_COMMA, ',');
      pos = skipWs(buf, pos + 1);
      r = readInt(buf, pos);
      pos = skipWs(buf, r.pos); // size, ignored
      expect(buf, pos, C_COMMA, ',');
      pos = skipWs(buf, pos + 1);
      expect(buf, pos, C_LBRACKET, '[');
      pos++;
      pos = skipWs(buf, pos);

      const myIdx = parents.length;
      parents.push(parent);
      fnInfo.push(fnIdx);
      idToIdx.set(id, myIdx);

      if (buf[pos] === C_RBRACKET) {
        // No children — close this node and ascend until we find a sibling or the root closes.
        pos++;
        while (true) {
          pos = skipWs(buf, pos);
          if (stack.length === 0) {
            // Closed the root.
            pos = skipWs(buf, pos);
            expect(buf, pos, C_RBRACKET, ']');
            return {
              traceData: {
                parents: Int32Array.from(parents),
                fnInfo: Int32Array.from(fnInfo),
                idToIdx,
              },
              endPos: pos + 1,
            };
          }
          if (buf[pos] === C_COMMA) {
            // Next sibling under the same parent.
            pos = skipWs(buf, pos + 1);
            parent = stack[stack.length - 1];
            break;
          }
          if (buf[pos] === C_RBRACKET) {
            // Close current parent's children list, ascend.
            pos++;
            stack.pop();
            continue;
          }
          throw new Error(
            `parseTraceTree: expected ',' or ']' at byte ${pos}, got 0x${buf[pos]?.toString(16)}`
          );
        }
      } else {
        // Has children — descend.
        stack.push(myIdx);
        parent = myIdx;
      }
    }
  }

  function parseSnapshot(buf: Buffer): ParsedSnapshot {
    let pos = skipWs(buf, 0);
    expect(buf, pos, C_LBRACE, '{');
    pos++;

    let snapshot: SnapshotHeader | undefined;
    let nodes: Float64Array | undefined;
    let edges: Float64Array | undefined;
    let strings: string[] | undefined;
    let traceFunctionInfos: Float64Array | undefined;
    let traceData: TraceData | undefined;

    while (true) {
      pos = skipWs(buf, pos);
      const c = buf[pos];
      if (c === C_RBRACE) {
        pos++;
        break;
      }
      if (c === C_COMMA) {
        pos++;
        continue;
      }

      const k = readKey(buf, pos);
      pos = k.pos;
      pos = skipWs(buf, pos);
      expect(buf, pos, C_COLON, ':');
      pos++;
      pos = skipWs(buf, pos);

      if (k.key === 'snapshot') {
        const objEnd = findMatchingBrace(buf, pos);
        snapshot = JSON.parse(buf.toString('utf-8', pos, objEnd + 1)) as SnapshotHeader;
        pos = objEnd + 1;
      } else if (k.key === 'nodes') {
        const expectedLen =
          snapshot !== undefined
            ? snapshot.node_count * snapshot.meta.node_fields.length
            : undefined;
        const tNodes = Date.now();
        const r = parseNumberArray(buf, pos, expectedLen);
        nodes = r.values;
        pos = r.endPos;
        status(`  parsed nodes (${nodes.length} ints) in ${elapsed(tNodes)}`);
      } else if (k.key === 'edges') {
        const expectedLen =
          snapshot !== undefined
            ? snapshot.edge_count * snapshot.meta.edge_fields.length
            : undefined;
        const tEdges = Date.now();
        const r = parseNumberArray(buf, pos, expectedLen);
        edges = r.values;
        pos = r.endPos;
        status(`  parsed edges (${edges.length} ints) in ${elapsed(tEdges)}`);
      } else if (k.key === 'trace_function_infos') {
        const t = Date.now();
        const r = parseNumberArray(buf, pos, undefined);
        traceFunctionInfos = r.values;
        pos = r.endPos;
        status(
          `  parsed trace_function_infos (${traceFunctionInfos.length} ints) in ${elapsed(t)}`
        );
      } else if (k.key === 'trace_tree') {
        const t = Date.now();
        const r = parseTraceTree(buf, pos);
        traceData = r.traceData;
        pos = r.endPos;
        status(`  parsed trace_tree (${traceData.parents.length} nodes) in ${elapsed(t)}`);
      } else if (k.key === 'strings') {
        const tStrs = Date.now();
        const r = parseStringArray(buf, pos);
        strings = r.values;
        pos = r.endPos;
        status(`  parsed strings (${strings.length} entries) in ${elapsed(tStrs)}`);
      } else {
        pos = skipValue(buf, pos);
      }
    }

    if (!snapshot || !nodes || !edges || !strings) {
      throw new Error(
        `Snapshot missing required sections: snapshot=${!!snapshot}, nodes=${!!nodes}, edges=${!!edges}, strings=${!!strings}`
      );
    }
    return { snapshot, nodes, edges, strings, traceFunctionInfos, traceData };
  }

  // --- Main ---
  const t0 = Date.now();
  status(`Reading ${snapshotPath}...`);
  const buf = readFileSync(snapshotPath);
  status(`  Read in ${elapsed(t0)} (${(buf.length / 1e6).toFixed(0)} MB)`);

  const tParse = Date.now();
  status('Parsing snapshot...');
  const root = parseSnapshot(buf);
  status(`  Parsed in ${elapsed(tParse)}`);

  const meta = root.snapshot.meta;
  const nodeFields = meta.node_fields;
  const edgeFields = meta.edge_fields;
  const nodeTypes = meta.node_types[0];
  const edgeTypes = meta.edge_types[0];
  const nf = nodeFields.length;
  const ef = edgeFields.length;

  const nTypeIdx = fieldIndex(nodeFields, 'type');
  const nNameIdx = fieldIndex(nodeFields, 'name');
  const nSizeIdx = fieldIndex(nodeFields, 'self_size');
  const nEdgeCntIdx = fieldIndex(nodeFields, 'edge_count');

  const eTypeIdx = fieldIndex(edgeFields, 'type');
  const eToIdx = fieldIndex(edgeFields, 'to_node');
  const eNameIdx = fieldIndex(edgeFields, 'name_or_index');

  const nodes = root.nodes;
  const edges = root.edges;
  const strings = root.strings;
  const nodeCount = Math.trunc(nodes.length / nf);
  const edgeCount = Math.trunc(edges.length / ef);
  status(`Nodes: ${nodeCount}, Edges: ${edgeCount}, Strings: ${strings.length}`);

  // Pre-compute package id for each string.
  const tStr = Date.now();
  status('Pre-computing string->package map...');
  const strPkg = new Int32Array(strings.length).fill(-1);
  const pkgNames: string[] = [];
  const pkgMap = new Map<string, number>();
  function internPkg(name: string): number {
    let id = pkgMap.get(name);
    if (id === undefined) {
      id = pkgNames.length;
      pkgNames.push(name);
      pkgMap.set(name, id);
    }
    return id;
  }
  let strMapped = 0;
  for (let i = 0; i < strings.length; i++) {
    const pkg = extractPkg(strings[i]);
    if (pkg !== undefined) {
      strPkg[i] = internPkg(pkg);
      strMapped++;
    }
  }
  status(`  ${strMapped} strings mapped to ${pkgNames.length} packages in ${elapsed(tStr)}`);

  // Library = third-party package from node_modules. Since extractPkg matches
  // KBN_RE first, every name starting with @kbn/ is a Kibana package; the rest
  // are libraries. Used by the alloc-site walk to optionally skip library
  // frames so attribution lands on the @kbn/ caller (surfaces wrapper packages
  // like @kbn/connector-schemas that trigger heavy zod allocations).
  const pkgIsLibrary = new Uint8Array(pkgNames.length);
  for (let i = 0; i < pkgNames.length; i++) {
    if (!pkgNames[i].startsWith('@kbn/')) pkgIsLibrary[i] = 1;
  }

  // Discover plugin packages via @kbn/repo-packages (reads precomputed manifest).
  const tPlugins = Date.now();
  status('Discovering plugin packages...');
  const pluginPkgIdSet = new Set<number>();
  let pluginPkgIdCount = 0;
  for (const pkg of getPackages(REPO_ROOT)) {
    if (!pkg.isPlugin()) continue;
    pluginPkgIdCount++;
    const pid = pkgMap.get(pkg.id);
    if (pid !== undefined) pluginPkgIdSet.add(pid);
  }
  status(
    `  ${pluginPkgIdCount} plugin packages, ${
      pluginPkgIdSet.size
    } present in snapshot, in ${elapsed(tPlugins)}`
  );

  // Build successor/predecessor lists as compact CSR-like linked lists in
  // typed arrays. Avoids per-node JS arrays in the hot path.
  const tGraph = Date.now();
  status('Building graph...');
  const fwdStart = new Uint32Array(nodeCount + 1);
  {
    let off = 0;
    for (let i = 0; i < nodeCount; i++) {
      fwdStart[i] = off;
      off += nodes[i * nf + nEdgeCntIdx];
    }
    fwdStart[nodeCount] = off;
  }

  const succHead = new Int32Array(nodeCount).fill(-1);
  const succNext = new Int32Array(edgeCount).fill(-1);
  const succTo = new Int32Array(edgeCount);
  let succUsed = 0;

  const predHead = new Int32Array(nodeCount).fill(-1);
  const predNext = new Int32Array(edgeCount).fill(-1);
  const predFrom = new Int32Array(edgeCount);
  let predUsed = 0;

  for (let i = 0; i < nodeCount; i++) {
    const eStart = fwdStart[i];
    const eEnd = fwdStart[i + 1];
    for (let e = eStart; e < eEnd; e++) {
      const eBase = e * ef;
      const eType = edges[eBase + eTypeIdx];
      if (eType >= 0 && eType < edgeTypes.length && edgeTypes[eType] === 'weak') continue;
      const toOff = edges[eBase + eToIdx];
      const toNode = Math.trunc(toOff / nf);
      if (toNode < 0 || toNode >= nodeCount || toNode === i) continue;

      const sId = succUsed++;
      succTo[sId] = toNode;
      succNext[sId] = succHead[i];
      succHead[i] = sId;

      const pId = predUsed++;
      predFrom[pId] = i;
      predNext[pId] = predHead[toNode];
      predHead[toNode] = pId;
    }
  }
  status(`  Graph built in ${elapsed(tGraph)} (${succUsed} forward edges)`);

  function* succOf(v: number): Generator<number> {
    for (let s = succHead[v]; s !== -1; s = succNext[s]) yield succTo[s];
  }
  function* predOf(v: number): Generator<number> {
    for (let p = predHead[v]; p !== -1; p = predNext[p]) yield predFrom[p];
  }

  // --- Lengauer-Tarjan dominator tree (iterative — avoids JS stack overflow on
  // huge graphs with deep path compression) ---
  const tDom = Date.now();
  status('Computing dominator tree...');

  const semi = new Int32Array(nodeCount);
  const vertex = new Int32Array(nodeCount);
  const parent = new Int32Array(nodeCount).fill(-1);
  const label = new Int32Array(nodeCount);
  const ancestor = new Int32Array(nodeCount).fill(-1);
  const idom = new Int32Array(nodeCount).fill(-1);
  const dfnum = new Int32Array(nodeCount).fill(-1);
  const buckets: number[][] = new Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    label[i] = i;
    buckets[i] = [];
  }

  {
    let count = 0;
    const stack: Array<{ v: number; succs: number[]; idx: number }> = [];
    const root0 = 0;
    dfnum[root0] = count;
    semi[root0] = count;
    vertex[count++] = root0;
    parent[root0] = -1;
    const succ0: number[] = [];
    for (const s of succOf(root0)) succ0.push(s);
    stack.push({ v: root0, succs: succ0, idx: 0 });
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.idx >= top.succs.length) {
        stack.pop();
        continue;
      }
      const w = top.succs[top.idx++];
      if (dfnum[w] !== -1) continue;
      dfnum[w] = count;
      semi[w] = count;
      vertex[count++] = w;
      parent[w] = top.v;
      const wSuccs: number[] = [];
      for (const s of succOf(w)) wSuccs.push(s);
      stack.push({ v: w, succs: wSuccs, idx: 0 });
    }
    status(`  DFS visited ${count}/${nodeCount} nodes`);
  }

  const reachableCount = (() => {
    let c = 0;
    for (let i = 0; i < nodeCount; i++) if (dfnum[i] !== -1) c++;
    return c;
  })();

  function evalNode(v: number): number {
    if (ancestor[v] === -1) return v;
    // Walk to root of ancestor chain, recording the path for compression.
    const path: number[] = [v];
    let cur = v;
    while (ancestor[cur] !== -1 && ancestor[ancestor[cur]] !== -1) {
      cur = ancestor[cur];
      path.push(cur);
    }
    for (let i = path.length - 1; i >= 0; i--) {
      const x = path[i];
      const a = ancestor[x];
      if (a === -1 || ancestor[a] === -1) continue;
      if (semi[label[a]] < semi[label[x]]) label[x] = label[a];
      ancestor[x] = ancestor[a];
    }
    return label[v];
  }

  for (let i = reachableCount - 1; i >= 1; i--) {
    const w = vertex[i];
    for (const v of predOf(w)) {
      if (dfnum[v] === -1) continue;
      const u = evalNode(v);
      if (semi[u] < semi[w]) semi[w] = semi[u];
    }
    buckets[vertex[semi[w]]].push(w);
    ancestor[w] = parent[w];
    const p = parent[w];
    if (p !== -1) {
      const bkt = buckets[p];
      buckets[p] = [];
      for (const v of bkt) {
        const u = evalNode(v);
        idom[v] = semi[u] < semi[v] ? u : p;
      }
    }
  }

  for (let i = 1; i < reachableCount; i++) {
    const w = vertex[i];
    if (idom[w] !== vertex[semi[w]]) {
      idom[w] = idom[idom[w]];
    }
  }
  idom[0] = 0;
  status(`  Dominators in ${elapsed(tDom)}`);

  // --- Retained sizes via dominator-tree post-order accumulation ---
  const tRet = Date.now();
  status('Computing retained sizes...');
  const selfSize = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) selfSize[i] = nodes[i * nf + nSizeIdx];

  const domChildHead = new Int32Array(nodeCount).fill(-1);
  const domChildNext = new Int32Array(nodeCount).fill(-1);
  const domChildTo = new Int32Array(nodeCount);
  let domEdgeUsed = 0;
  for (let i = 1; i < nodeCount; i++) {
    if (idom[i] === -1) continue;
    const p = idom[i];
    if (p === i) continue;
    const e = domEdgeUsed++;
    domChildTo[e] = i;
    domChildNext[e] = domChildHead[p];
    domChildHead[p] = e;
  }

  const postorder = new Int32Array(nodeCount);
  let postCount = 0;
  {
    const stack: Array<{ v: number; iter: number; processed: boolean }> = [];
    stack.push({ v: 0, iter: domChildHead[0], processed: false });
    const visited = new Uint8Array(nodeCount);
    visited[0] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.processed) {
        postorder[postCount++] = top.v;
        stack.pop();
        continue;
      }
      if (top.iter !== -1) {
        const child = domChildTo[top.iter];
        top.iter = domChildNext[top.iter];
        if (!visited[child]) {
          visited[child] = 1;
          stack.push({ v: child, iter: domChildHead[child], processed: false });
        }
        continue;
      }
      top.processed = true;
    }
  }

  const retained = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) retained[i] = selfSize[i];
  for (let i = 0; i < postCount; i++) {
    const v = postorder[i];
    const d = idom[v];
    if (d !== -1 && d !== v) retained[d] += retained[v];
  }
  status(`  Retained sizes in ${elapsed(tRet)}`);

  // --- Attribute every node to a package ---
  //
  // Two deterministic attributions, both seeded only from explicit evidence
  // (node-name string match + closure/code source-file match) then propagated
  // down the dominator tree:
  //
  //   package — every package seeds. Per-npm-package view.
  //   plugins — only plugin-typed packages seed. Children inherit from the
  //             nearest plugin ancestor; rolls up to product domain / owning team.
  //
  // We deliberately avoid stacked-heuristic ("first retainer wins") attributions
  // — they over-attribute and shift between snapshots, polluting the signal.
  // True graph-shrinkage is reported separately as Saved (counterfactual).

  const SRC_EDGE_NAMES = new Set(['shared', 'source', 'script']);

  // Pass 1: node name string carries a package marker. Only fills slots that
  // haven't already been claimed.
  function fillFromNodeNames(target: Int32Array): number {
    let count = 0;
    for (let i = 0; i < nodeCount; i++) {
      if (target[i] !== -1) continue;
      const nameIdx = nodes[i * nf + nNameIdx];
      const pid = strPkg[nameIdx];
      if (pid !== -1) {
        target[i] = pid;
        count++;
      }
    }
    return count;
  }

  // Pass 3: closures/code with a "shared"/"source"/"script" edge whose target
  // (or grand-target) is a package-named string.
  function fillFromClosureSource(target: Int32Array): number {
    let count = 0;
    for (let i = 0; i < nodeCount; i++) {
      if (target[i] !== -1) continue;
      const ntype = nodes[i * nf + nTypeIdx];
      if (ntype < 0 || ntype >= nodeTypes.length) continue;
      const tname = nodeTypes[ntype];
      if (tname !== 'closure' && tname !== 'code') continue;

      const eStart = fwdStart[i];
      const eEnd = fwdStart[i + 1];
      let found = false;
      for (let e = eStart; e < eEnd && !found; e++) {
        const eBase = e * ef;
        const enIdx = edges[eBase + eNameIdx];
        if (enIdx < 0 || enIdx >= strings.length) continue;
        if (!SRC_EDGE_NAMES.has(strings[enIdx])) continue;
        const toOff = edges[eBase + eToIdx];
        const toNode = Math.trunc(toOff / nf);
        if (toNode < 0 || toNode >= nodeCount) continue;

        const tNameIdx = nodes[toNode * nf + nNameIdx];
        let pid = strPkg[tNameIdx];
        if (pid !== -1) {
          target[i] = pid;
          count++;
          found = true;
          break;
        }
        const teStart = fwdStart[toNode];
        const teEnd = fwdStart[toNode + 1];
        for (let te = teStart; te < teEnd && !found; te++) {
          const teBase = te * ef;
          const teTo = Math.trunc(edges[teBase + eToIdx] / nf);
          if (teTo < 0 || teTo >= nodeCount) continue;
          const subName = nodes[teTo * nf + nNameIdx];
          pid = strPkg[subName];
          if (pid !== -1) {
            target[i] = pid;
            count++;
            found = true;
            break;
          }
          const seStart = fwdStart[teTo];
          const seEnd = fwdStart[teTo + 1];
          for (let se = seStart; se < seEnd && !found; se++) {
            const seBase = se * ef;
            const seTo = Math.trunc(edges[seBase + eToIdx] / nf);
            if (seTo < 0 || seTo >= nodeCount) continue;
            const sName = nodes[seTo * nf + nNameIdx];
            pid = strPkg[sName];
            if (pid !== -1) {
              target[i] = pid;
              count++;
              found = true;
              break;
            }
          }
        }
      }
    }
    return count;
  }

  // Pass 5: top-down dominator-tree propagation. Reverse postorder visits root
  // before children, so each unattributed node can inherit from its parent.
  function propagateViaDominators(target: Int32Array): number {
    let count = 0;
    for (let i = postCount - 1; i >= 0; i--) {
      const v = postorder[i];
      if (target[v] !== -1) continue;
      const d = idom[v];
      if (d !== -1 && d !== v && target[d] !== -1) {
        target[v] = target[d];
        count++;
      }
    }
    return count;
  }

  // Compute "directly-owned" attribution from explicit evidence (passes 1 + 3).
  // Reused as the seed for package- and plugins-mode propagation, and as the
  // per-package node set for counterfactual shrinkage.
  const tDirect = Date.now();
  status('Computing directly-owned attribution (passes 1+3)...');
  const directlyOwnedPkg = new Int32Array(nodeCount).fill(-1);
  const cDirect1 = fillFromNodeNames(directlyOwnedPkg);
  const cDirect3 = fillFromClosureSource(directlyOwnedPkg);
  status(
    `  Direct: ${cDirect1} node-names + ${cDirect3} closure/code = ${
      cDirect1 + cDirect3
    } nodes in ${elapsed(tDirect)}`
  );

  // --- Mode: package (direct seeds + dominator propagation) ---
  const tPackage = Date.now();
  status('Attributing (package mode)...');
  const nodePkgPackage = new Int32Array(nodeCount);
  nodePkgPackage.set(directlyOwnedPkg);
  propagateViaDominators(nodePkgPackage);
  status(`  package mode in ${elapsed(tPackage)}`);

  // --- Mode: plugins (only seed plugin packages) ---
  const tPlugin = Date.now();
  status('Attributing (plugins mode)...');
  const nodePkgPlugins = new Int32Array(nodeCount).fill(-1);
  for (let i = 0; i < nodeCount; i++) {
    const pid = directlyOwnedPkg[i];
    if (pid !== -1 && pluginPkgIdSet.has(pid)) nodePkgPlugins[i] = pid;
  }
  propagateViaDominators(nodePkgPlugins);
  status(`  plugins mode in ${elapsed(tPlugin)}`);

  // --- Mode: alloc-site (allocation tracking, requires tracked snapshot) ---
  //
  // For each live node with a trace_node_id > 0, walk up the trace tree's
  // parent chain. The first frame whose script_name matches a plugin package
  // wins. This attributes library-allocated state (zod schemas, langchain
  // objects, etc.) back to the plugin that triggered the allocation.
  const nodePkgAllocSite = new Int32Array(nodeCount).fill(-1);
  // Parallel attribution: first package frame (any package, not just plugins). When
  // --filter is active, skip frames matching the filter regex so attribution lands
  // on the *caller* of the filtered code rather than the filtered code itself.
  const nodePkgAllocSitePkg = new Int32Array(nodeCount).fill(-1);
  // Parallel attribution: first non-library package frame (skips third-party
  // node_modules packages). Surfaces @kbn/* wrapper packages whose own bytes
  // are tiny but which trigger heavy library allocations (zod schemas, etc.).
  const nodePkgAllocSiteCaller = new Int32Array(nodeCount).fill(-1);
  // When --filter is active, marks nodes whose leaf trace frame did NOT match
  // the regex. Lets the aggregation loop distinguish "filtered out" from
  // "passed filter but no plugin/package frame above" (the latter must flow
  // into the unattributed buckets).
  const nodeFilteredOut = filterRegex ? new Uint8Array(nodeCount) : undefined;
  let allocUntrackedNodes = 0;
  let allocFilteredOut = 0;
  let allocAttributable = false;
  const traceNodeIdFieldIdx = nodeFields.indexOf('trace_node_id');
  if (
    traceNodeIdFieldIdx !== -1 &&
    root.traceData !== undefined &&
    root.traceData.parents.length > 0 &&
    root.traceFunctionInfos !== undefined &&
    root.traceFunctionInfos.length > 0
  ) {
    allocAttributable = true;
    const tAlloc = Date.now();
    status(
      filterRegex
        ? `Attributing (alloc-site mode, filtered to /${filterStr}/)...`
        : 'Attributing (alloc-site mode)...'
    );

    const td = root.traceData;
    const tfi = root.traceFunctionInfos;
    // trace_function_info_fields: function_id, name, script_name, script_id, line, column
    const tfiFields = meta.trace_function_info_fields ?? [
      'function_id',
      'name',
      'script_name',
      'script_id',
      'line',
      'column',
    ];
    const tfiStride = tfiFields.length;
    const tfiScriptIdx = tfiFields.indexOf('script_name');
    if (tfiScriptIdx === -1) throw new Error('trace_function_info_fields missing script_name');

    // Memoize per-trace-node "does this frame's script match the filter?" so we
    // don't re-test the same string id repeatedly while walking parents.
    // 0 = unset, 1 = matches filter, 2 = does not match.
    const filterCache = filterRegex ? new Uint8Array(strings.length) : undefined;
    function frameMatchesFilter(scriptStrId: number): boolean {
      if (!filterRegex || !filterCache) return false;
      if (scriptStrId < 0 || scriptStrId >= strings.length) return false;
      const c = filterCache[scriptStrId];
      if (c === 1) return true;
      if (c === 2) return false;
      const matches = filterRegex.test(strings[scriptStrId]);
      filterCache[scriptStrId] = matches ? 1 : 2;
      return matches;
    }

    function leafScriptStrId(traceIdx: number): number {
      const fnIdx = td.fnInfo[traceIdx];
      if (fnIdx < 0) return -1;
      const offset = fnIdx * tfiStride + tfiScriptIdx;
      if (offset >= tfi.length) return -1;
      return tfi[offset];
    }

    // Per-trace-node: cached first-plugin package id (memoized walk).
    // -2 = uncomputed, -1 = computed and no plugin found.
    const traceFirstPlugin = new Int32Array(td.parents.length).fill(-2);
    // Same idea, but for any-package attribution.
    const traceFirstPkg = new Int32Array(td.parents.length).fill(-2);
    // And for non-library (Kibana-package) attribution.
    const traceFirstNonLibPkg = new Int32Array(td.parents.length).fill(-2);

    function firstPluginFor(traceIdx: number): number {
      if (traceIdx < 0) return -1;
      let cur = traceIdx;
      // Walk up, but stop at the first cached entry.
      const path: number[] = [];
      while (cur >= 0 && traceFirstPlugin[cur] === -2) {
        path.push(cur);
        const fnIdx = td.fnInfo[cur];
        if (fnIdx >= 0 && fnIdx * tfiStride + tfiScriptIdx < tfi.length) {
          const scriptStrId = tfi[fnIdx * tfiStride + tfiScriptIdx];
          const pid = scriptStrId >= 0 && scriptStrId < strPkg.length ? strPkg[scriptStrId] : -1;
          if (pid !== -1 && pluginPkgIdSet.has(pid) && !frameMatchesFilter(scriptStrId)) {
            // Found a plugin frame here. Backfill the path below it with this pid.
            for (const p of path) traceFirstPlugin[p] = pid;
            return pid;
          }
        }
        cur = td.parents[cur];
      }
      // Either ran off the top, or hit a cached entry. Propagate that result.
      const result = cur >= 0 ? traceFirstPlugin[cur] : -1;
      for (const p of path) traceFirstPlugin[p] = result;
      return result;
    }

    // Walk to first frame mapped to a known package. When --filter is active,
    // skip frames whose script matches the filter (so attribution lands on the
    // caller of the filtered code).
    function firstPkgFor(traceIdx: number): number {
      if (traceIdx < 0) return -1;
      let cur = traceIdx;
      const path: number[] = [];
      while (cur >= 0 && traceFirstPkg[cur] === -2) {
        path.push(cur);
        const fnIdx = td.fnInfo[cur];
        if (fnIdx >= 0 && fnIdx * tfiStride + tfiScriptIdx < tfi.length) {
          const scriptStrId = tfi[fnIdx * tfiStride + tfiScriptIdx];
          const pid = scriptStrId >= 0 && scriptStrId < strPkg.length ? strPkg[scriptStrId] : -1;
          if (pid !== -1 && !frameMatchesFilter(scriptStrId)) {
            for (const p of path) traceFirstPkg[p] = pid;
            return pid;
          }
        }
        cur = td.parents[cur];
      }
      const result = cur >= 0 ? traceFirstPkg[cur] : -1;
      for (const p of path) traceFirstPkg[p] = result;
      return result;
    }

    // Walk to the first @kbn/ (non-library) package frame. Skips library
    // packages (node_modules deps) and --filter-matched frames. Used for the
    // by-Package alloc table so wrapper packages like @kbn/connector-schemas
    // get credit for the library allocations they trigger.
    function firstNonLibPkgFor(traceIdx: number): number {
      if (traceIdx < 0) return -1;
      let cur = traceIdx;
      const path: number[] = [];
      while (cur >= 0 && traceFirstNonLibPkg[cur] === -2) {
        path.push(cur);
        const fnIdx = td.fnInfo[cur];
        if (fnIdx >= 0 && fnIdx * tfiStride + tfiScriptIdx < tfi.length) {
          const scriptStrId = tfi[fnIdx * tfiStride + tfiScriptIdx];
          const pid = scriptStrId >= 0 && scriptStrId < strPkg.length ? strPkg[scriptStrId] : -1;
          if (pid !== -1 && !pkgIsLibrary[pid] && !frameMatchesFilter(scriptStrId)) {
            for (const p of path) traceFirstNonLibPkg[p] = pid;
            return pid;
          }
        }
        cur = td.parents[cur];
      }
      const result = cur >= 0 ? traceFirstNonLibPkg[cur] : -1;
      for (const p of path) traceFirstNonLibPkg[p] = result;
      return result;
    }

    for (let i = 0; i < nodeCount; i++) {
      const traceId = nodes[i * nf + traceNodeIdFieldIdx];
      if (traceId <= 0) {
        allocUntrackedNodes++;
        continue;
      }
      const tIdx = td.idToIdx.get(traceId);
      if (tIdx === undefined) {
        allocUntrackedNodes++;
        continue;
      }
      // Apply --filter: include only nodes whose leaf trace frame's script
      // matches the regex.
      if (filterRegex) {
        const leafScriptId = leafScriptStrId(tIdx);
        if (!frameMatchesFilter(leafScriptId)) {
          allocFilteredOut++;
          nodeFilteredOut![i] = 1;
          continue;
        }
      }
      const plgPid = firstPluginFor(tIdx);
      if (plgPid !== -1) nodePkgAllocSite[i] = plgPid;
      const pkgPid = firstPkgFor(tIdx);
      if (pkgPid !== -1) nodePkgAllocSitePkg[i] = pkgPid;
      const callerPid = firstNonLibPkgFor(tIdx);
      if (callerPid !== -1) nodePkgAllocSiteCaller[i] = callerPid;
    }
    const filterMsg = filterRegex ? `, ${allocFilteredOut} filtered out` : '';
    status(
      `  alloc-site mode in ${elapsed(
        tAlloc
      )} (${allocUntrackedNodes} nodes without trace ctx${filterMsg})`
    );
  } else {
    status('Skipping alloc-site mode (snapshot has no allocation tracking data).');
  }

  // --- Aggregate per-package retained bytes (boundary-aware to avoid
  // triple-counting nested subtrees) ---
  const pkgCount = pkgNames.length;
  const pkgPackageBytes = new Float64Array(pkgCount);
  const pluginPluginBytes = new Float64Array(pkgCount);

  function aggregateBoundary(modeArr: Int32Array, target: Float64Array): number {
    // Returns total retained bytes that fell outside any package (root subtree share with no owner).
    let unattr = 0;
    const rootPid = modeArr[0];
    if (rootPid === -1) {
      unattr += retained[0];
    } else {
      target[rootPid] += retained[0];
    }
    for (let i = 1; i < nodeCount; i++) {
      const pid = modeArr[i];
      const d = idom[i];
      const parentPid = d >= 0 && d < nodeCount ? modeArr[d] : -2;
      if (pid === parentPid) continue;
      if (pid === -1) unattr += retained[i];
      else target[pid] += retained[i];
    }
    return unattr;
  }

  const unattrPackage = aggregateBoundary(nodePkgPackage, pkgPackageBytes);
  const unattrPlugins = aggregateBoundary(nodePkgPlugins, pluginPluginBytes);

  // Alloc-site aggregation is allocation-driven, not retention-driven, so
  // `aggregateBoundary` (which de-duplicates via dominator parent ownership)
  // would systematically under-count: each node carries its allocator
  // independently of who dominates it. We sum self_size directly per plugin.
  const pluginAllocBytes = new Float64Array(pkgCount);
  // Same idea for by-module attribution (first package frame, including
  // node_modules libraries — zod, joi, etc. dominate this view).
  const pkgAllocBytes = new Float64Array(pkgCount);
  // And for by-package attribution (skips library frames so @kbn/* wrappers
  // get credit for the library allocations they trigger).
  const pkgCallerBytes = new Float64Array(pkgCount);
  let unattrAllocSite = 0;
  let allocSiteUntrackedBytes = 0;
  let unattrAllocSiteModule = 0;
  let unattrAllocSitePackage = 0;
  if (allocAttributable) {
    for (let i = 0; i < nodeCount; i++) {
      // Filtered-out nodes (leaf frame didn't match --filter) are excluded from
      // every bucket; they're already counted in allocFilteredOut.
      if (nodeFilteredOut && nodeFilteredOut[i]) continue;
      const pid = nodePkgAllocSite[i];
      const pkgPid = nodePkgAllocSitePkg[i];
      const callerPid = nodePkgAllocSiteCaller[i];
      const traceId = nodes[i * nf + traceNodeIdFieldIdx];

      if (pid === -1) {
        if (traceId <= 0) allocSiteUntrackedBytes += selfSize[i];
        else unattrAllocSite += selfSize[i];
      } else {
        pluginAllocBytes[pid] += selfSize[i];
      }

      if (pkgPid === -1) {
        if (traceId > 0) unattrAllocSiteModule += selfSize[i];
        // pre-tracking nodes are already counted in allocSiteUntrackedBytes
      } else {
        pkgAllocBytes[pkgPid] += selfSize[i];
      }

      if (callerPid === -1) {
        if (traceId > 0) unattrAllocSitePackage += selfSize[i];
      } else {
        pkgCallerBytes[callerPid] += selfSize[i];
      }
    }
  }

  let totalSelf = 0;
  for (let i = 0; i < nodeCount; i++) totalSelf += selfSize[i];
  const rootRetained = retained[0];

  // Node-type breakdown.
  const typeSelf = new Map<string, number>();
  const typeCount = new Map<string, number>();
  const typeRetained = new Map<string, number>();
  for (let i = 0; i < nodeCount; i++) {
    const ntype = nodes[i * nf + nTypeIdx];
    const tname = ntype >= 0 && ntype < nodeTypes.length ? nodeTypes[ntype] : 'unknown';
    typeSelf.set(tname, (typeSelf.get(tname) ?? 0) + selfSize[i]);
    typeCount.set(tname, (typeCount.get(tname) ?? 0) + 1);
    const d = idom[i];
    const parentType = d >= 0 && d < nodeCount && d !== i ? nodes[d * nf + nTypeIdx] : -1;
    if (parentType !== ntype) {
      typeRetained.set(tname, (typeRetained.get(tname) ?? 0) + retained[i]);
    }
  }

  // --- Counterfactual shrinkage ---
  //
  // For each entity (package or plugin), compute "if its directly-owned nodes
  // were unreachable, how much heap would shrink?". BFS from root over forward
  // edges, skipping owned nodes; sum selfSize over (originally reachable) ∩ (not
  // visited now). Independent of attribution heuristic.
  const cfSavedByPkg = new Float64Array(pkgCount);
  const cfHasResult = new Uint8Array(pkgCount);

  if (counterfactualMode) {
    const tCf = Date.now();

    // Bucket directly-owned nodes by package id.
    const ownerCount = new Uint32Array(pkgCount);
    for (let i = 0; i < nodeCount; i++) {
      const pid = directlyOwnedPkg[i];
      if (pid !== -1) ownerCount[pid]++;
    }
    const ownerStart = new Uint32Array(pkgCount + 1);
    for (let i = 0; i < pkgCount; i++) ownerStart[i + 1] = ownerStart[i] + ownerCount[i];
    const ownerNodes = new Int32Array(ownerStart[pkgCount]);
    const ownerCursor = new Uint32Array(pkgCount);
    for (let i = 0; i < nodeCount; i++) {
      const pid = directlyOwnedPkg[i];
      if (pid !== -1) {
        ownerNodes[ownerStart[pid] + ownerCursor[pid]++] = i;
      }
    }

    const visited = new Uint8Array(nodeCount);
    const removed = new Uint8Array(nodeCount);
    const queue = new Int32Array(nodeCount);

    const computeSavedFor = (pid: number): void => {
      if (cfHasResult[pid]) return;
      cfHasResult[pid] = 1;
      const oStart = ownerStart[pid];
      const oEnd = ownerStart[pid + 1];
      if (oEnd === oStart) return;

      visited.fill(0);
      removed.fill(0);
      for (let k = oStart; k < oEnd; k++) removed[ownerNodes[k]] = 1;

      let head = 0;
      let tail = 0;
      if (!removed[0]) {
        visited[0] = 1;
        queue[tail++] = 0;
      }
      while (head < tail) {
        const v = queue[head++];
        for (let s = succHead[v]; s !== -1; s = succNext[s]) {
          const w = succTo[s];
          if (removed[w] || visited[w]) continue;
          visited[w] = 1;
          queue[tail++] = w;
        }
      }
      let saved = 0;
      for (let i = 0; i < nodeCount; i++) {
        if (dfnum[i] === -1 || visited[i]) continue;
        saved += selfSize[i];
      }
      cfSavedByPkg[pid] = saved;
    };

    // Top N packages by package-mode bytes...
    status(`Counterfactual shrinkage: top ${counterfactualTopN} packages...`);
    const sortedByPackage = Array.from({ length: pkgCount }, (_, i) => i).sort(
      (a, b) => pkgPackageBytes[b] - pkgPackageBytes[a]
    );
    for (let r = 0; r < Math.min(counterfactualTopN, sortedByPackage.length); r++) {
      computeSavedFor(sortedByPackage[r]);
    }

    // ...and top N plugins by plugins-mode bytes.
    status(`Counterfactual shrinkage: top ${counterfactualTopN} plugins...`);
    const sortedPluginsByBytes = Array.from(pluginPkgIdSet).sort(
      (a, b) => pluginPluginBytes[b] - pluginPluginBytes[a]
    );
    for (let r = 0; r < Math.min(counterfactualTopN, sortedPluginsByBytes.length); r++) {
      computeSavedFor(sortedPluginsByBytes[r]);
    }

    status(`  Counterfactual in ${elapsed(tCf)}`);
  }

  // --- Build rows ---
  const pkgRows: PackageRow[] = [];
  for (let i = 0; i < pkgCount; i++) {
    if (pkgPackageBytes[i] === 0 && cfSavedByPkg[i] === 0) continue;
    pkgRows.push({
      package: pkgNames[i],
      retainedBytes: pkgPackageBytes[i],
      savedBytes: cfSavedByPkg[i],
      retainedPct: rootRetained > 0 ? (pkgPackageBytes[i] / rootRetained) * 100 : 0,
      savedPct: rootRetained > 0 ? (cfSavedByPkg[i] / rootRetained) * 100 : 0,
    });
  }
  // Sort by max(retained, saved) so load-bearing packages with small direct
  // attribution (like zod) still appear near the top.
  pkgRows.sort(
    (a, b) => Math.max(b.retainedBytes, b.savedBytes) - Math.max(a.retainedBytes, a.savedBytes)
  );

  const pluginRows: PluginRow[] = [];
  for (const i of pluginPkgIdSet) {
    if (pluginPluginBytes[i] === 0 && cfSavedByPkg[i] === 0 && pluginAllocBytes[i] === 0) continue;
    pluginRows.push({
      plugin: pkgNames[i],
      retainedBytes: pluginPluginBytes[i],
      savedBytes: cfSavedByPkg[i],
      allocBytes: pluginAllocBytes[i],
      retainedPct: rootRetained > 0 ? (pluginPluginBytes[i] / rootRetained) * 100 : 0,
      savedPct: rootRetained > 0 ? (cfSavedByPkg[i] / rootRetained) * 100 : 0,
      allocPct: rootRetained > 0 ? (pluginAllocBytes[i] / rootRetained) * 100 : 0,
    });
  }
  pluginRows.sort(
    (a, b) =>
      Math.max(b.retainedBytes, b.savedBytes, b.allocBytes) -
      Math.max(a.retainedBytes, a.savedBytes, a.allocBytes)
  );

  // Per-module / per-package allocation rows (only meaningful when allocation
  // tracking is on). Modules = third-party node_modules libs. Packages =
  // @kbn/* Kibana packages, attributed via the caller walk so wrappers get
  // credit for library bytes they trigger.
  const moduleAllocRows: PackageAllocRow[] = [];
  const pkgAllocRows: PackageAllocRow[] = [];
  if (allocAttributable) {
    for (let i = 0; i < pkgCount; i++) {
      if (pkgIsLibrary[i]) {
        if (pkgAllocBytes[i] === 0) continue;
        moduleAllocRows.push({
          package: pkgNames[i],
          allocBytes: pkgAllocBytes[i],
          allocPct: rootRetained > 0 ? (pkgAllocBytes[i] / rootRetained) * 100 : 0,
        });
      } else {
        if (pkgCallerBytes[i] === 0) continue;
        pkgAllocRows.push({
          package: pkgNames[i],
          allocBytes: pkgCallerBytes[i],
          allocPct: rootRetained > 0 ? (pkgCallerBytes[i] / rootRetained) * 100 : 0,
        });
      }
    }
    moduleAllocRows.sort((a, b) => b.allocBytes - a.allocBytes);
    pkgAllocRows.sort((a, b) => b.allocBytes - a.allocBytes);
  }

  const typeRows: NodeTypeRow[] = [];
  for (const [type, sz] of typeSelf) {
    typeRows.push({
      type,
      self: sz,
      selfPct: (sz / totalSelf) * 100,
      count: typeCount.get(type) ?? 0,
      retainedBoundary: typeRetained.get(type) ?? 0,
    });
  }
  typeRows.sort((a, b) => b.self - a.self);

  const report: JsonReport = {
    totalSelf,
    rootRetained,
    nodeCount,
    edgeCount,
    pluginCount: pluginPkgIdSet.size,
    hasAllocationTracking: allocAttributable,
    ...(filterStr !== undefined ? { filter: filterStr } : {}),
    packages: pkgRows,
    plugins: pluginRows,
    ...(allocAttributable ? { modulesAlloc: moduleAllocRows, packagesAlloc: pkgAllocRows } : {}),
    unattributed: {
      package: {
        retainedBytes: unattrPackage,
        pct: rootRetained > 0 ? (unattrPackage / rootRetained) * 100 : 0,
      },
      plugins: {
        retainedBytes: unattrPlugins,
        pct: rootRetained > 0 ? (unattrPlugins / rootRetained) * 100 : 0,
      },
      ...(allocAttributable
        ? {
            allocSite: {
              retainedBytes: unattrAllocSite,
              pct: rootRetained > 0 ? (unattrAllocSite / rootRetained) * 100 : 0,
            },
            allocSiteUntracked: {
              retainedBytes: allocSiteUntrackedBytes,
              pct: rootRetained > 0 ? (allocSiteUntrackedBytes / rootRetained) * 100 : 0,
            },
            allocSiteModule: {
              retainedBytes: unattrAllocSiteModule,
              pct: rootRetained > 0 ? (unattrAllocSiteModule / rootRetained) * 100 : 0,
            },
            allocSitePackage: {
              retainedBytes: unattrAllocSitePackage,
              pct: rootRetained > 0 ? (unattrAllocSitePackage / rootRetained) * 100 : 0,
            },
          }
        : {}),
    },
    nodeTypes: typeRows,
  };

  if (jsonMode) {
    const json = JSON.stringify(report, null, 2);
    if (jsonFile) {
      writeFileSync(jsonFile, json);
      status(`  Wrote JSON to ${jsonFile}`);
    } else {
      process.stdout.write(json + '\n');
    }
    status(`Total time: ${elapsed(t0)}`);
    process.exit(0);
  }

  const out = process.stdout;

  // --- Node-type breakdown ---
  out.write('=== Heap Breakdown by V8 Node Type ===\n\n');
  out.write(
    `${pad('Node Type', 20)} | ${pad('Self', 10, true)} | ${pad('Self %', 10, true)} | ${pad(
      'Count',
      8,
      true
    )} | ${pad('Ret (boundary)', 14, true)}\n`
  );
  out.write(
    '-'.repeat(20) +
      '-+-' +
      '-'.repeat(10) +
      '-+-' +
      '-'.repeat(10) +
      '-+-' +
      '-'.repeat(8) +
      '-+-' +
      '-'.repeat(14) +
      '\n'
  );
  for (const row of typeRows) {
    out.write(
      `${pad(truncate(row.type, 20), 20)} | ` +
        `${pad(fmtBytes(row.self), 10, true)} | ` +
        `${pad(row.selfPct.toFixed(1) + '%', 10, true)} | ` +
        `${pad(String(row.count), 8, true)} | ` +
        `${pad(fmtBytes(row.retainedBoundary), 14, true)}\n`
    );
  }
  out.write('\n');

  out.write('=== Heap Snapshot Summary ===\n\n');
  out.write(`Total self size:     ${pad(fmtBytes(totalSelf), 10, true)}\n`);
  out.write(`Root retained size:  ${pad(fmtBytes(rootRetained), 10, true)}\n`);
  out.write(
    `Nodes: ${nodeCount}, Edges: ${edgeCount}, Plugins discovered: ${pluginPkgIdSet.size}\n\n`
  );

  // --- Per-package table ---
  out.write('=== Retained by Package ===\n');
  out.write(
    'Retained: bytes attributed via direct evidence + dominator propagation.\n' +
      "Saved: counterfactual — bytes that become unreachable if this package's\n" +
      'directly-owned nodes were removed (independent of attribution; "-" if not\n' +
      'in top-N counterfactual scope).\n\n'
  );
  const tableHdr = (header: string) =>
    `${pad(header, 55)} | ${pad('Retained', 9, true)} | ${pad('Ret MB', 9, true)} | ${pad(
      'Saved',
      9,
      true
    )} | ${pad('Saved MB', 9, true)}\n`;
  const tableSep =
    '-'.repeat(55) +
    '-+-' +
    '-'.repeat(9) +
    '-+-' +
    '-'.repeat(9) +
    '-+-' +
    '-'.repeat(9) +
    '-+-' +
    '-'.repeat(9) +
    '\n';
  out.write(tableHdr('Package'));
  out.write(tableSep);
  let pkgShown = 0;
  for (const row of pkgRows) {
    if (row.retainedPct < 0.05 && row.savedPct < 0.05) continue;
    if (pkgShown++ >= 60) break;
    out.write(
      `${pad(truncate(row.package, 55), 55)} | ` +
        `${pad(row.retainedPct.toFixed(1) + '%', 9, true)} | ` +
        `${pad(fmtBytes(row.retainedBytes), 9, true)} | ` +
        `${pad(row.savedBytes > 0 ? row.savedPct.toFixed(1) + '%' : '-', 9, true)} | ` +
        `${pad(row.savedBytes > 0 ? fmtBytes(row.savedBytes) : '-', 9, true)}\n`
    );
  }
  out.write(
    `${pad('(unattributed: V8/runtime/shared infra)', 55)} | ` +
      `${pad(report.unattributed.package.pct.toFixed(1) + '%', 9, true)} | ` +
      `${pad(fmtBytes(report.unattributed.package.retainedBytes), 9, true)} | ` +
      `${pad('-', 9, true)} | ${pad('-', 9, true)}\n`
  );
  out.write('\n');

  // --- Per-plugin table ---
  out.write('=== Retained by Plugin (rolled up to product domain) ===\n');
  out.write(
    'Plugins-mode propagates attribution to the nearest plugin ancestor in the\n' +
      'dominator tree, so shared infra rolls up to the plugin that holds it alive.\n\n'
  );
  out.write(tableHdr('Plugin'));
  out.write(tableSep);
  let plgShown = 0;
  for (const row of pluginRows) {
    if (row.retainedPct < 0.05 && row.savedPct < 0.05) continue;
    if (plgShown++ >= 60) break;
    out.write(
      `${pad(truncate(row.plugin, 55), 55)} | ` +
        `${pad(row.retainedPct.toFixed(1) + '%', 9, true)} | ` +
        `${pad(fmtBytes(row.retainedBytes), 9, true)} | ` +
        `${pad(row.savedBytes > 0 ? row.savedPct.toFixed(1) + '%' : '-', 9, true)} | ` +
        `${pad(row.savedBytes > 0 ? fmtBytes(row.savedBytes) : '-', 9, true)}\n`
    );
  }
  out.write(
    `${pad('(non-plugin: core/platform/libraries/V8)', 55)} | ` +
      `${pad(report.unattributed.plugins.pct.toFixed(1) + '%', 9, true)} | ` +
      `${pad(fmtBytes(report.unattributed.plugins.retainedBytes), 9, true)} | ` +
      `${pad('-', 9, true)} | ${pad('-', 9, true)}\n`
  );

  // --- Per-plugin allocation-site table (only when tracking is present) ---
  if (allocAttributable) {
    const filterSuffix = filterRegex ? `, filtered to /${filterStr}/` : '';
    out.write('\n');
    out.write(`=== Allocated by Plugin (allocation site${filterSuffix}) ===\n`);
    out.write(
      'For each live node, walks the allocation-time call stack to the first\n' +
        'plugin frame. Library memory (zod schemas, langchain objects, etc.) rolls\n' +
        'up to the plugin that triggered the allocation, not the dominator chain.\n' +
        'Self bytes only — no Saved column (counterfactual is a graph property).\n' +
        (filterRegex
          ? `Filtered: only nodes whose deepest allocation frame script_name\n` +
            `matches /${filterStr}/. Attribution skips frames that match the filter\n` +
            `(walks past them to the caller).\n\n`
          : '\n')
    );
    const allocHdr = `${pad('Plugin', 55)} | ${pad('Allocated', 9, true)} | ${pad(
      'Alloc MB',
      9,
      true
    )}\n`;
    const allocSep = '-'.repeat(55) + '-+-' + '-'.repeat(9) + '-+-' + '-'.repeat(9) + '\n';
    out.write(allocHdr);
    out.write(allocSep);
    const sortedAlloc = [...pluginRows].sort((a, b) => b.allocBytes - a.allocBytes);
    let allocShown = 0;
    for (const row of sortedAlloc) {
      if (row.allocPct < 0.05) continue;
      if (allocShown++ >= 60) break;
      out.write(
        `${pad(truncate(row.plugin, 55), 55)} | ` +
          `${pad(row.allocPct.toFixed(1) + '%', 9, true)} | ` +
          `${pad(fmtBytes(row.allocBytes), 9, true)}\n`
      );
    }
    out.write(
      `${pad('(no plugin frame in alloc stack)', 55)} | ` +
        `${pad((report.unattributed.allocSite?.pct ?? 0).toFixed(1) + '%', 9, true)} | ` +
        `${pad(fmtBytes(report.unattributed.allocSite?.retainedBytes ?? 0), 9, true)}\n`
    );
    out.write(
      `${pad('(untracked: pre-tracking / native allocs)', 55)} | ` +
        `${pad((report.unattributed.allocSiteUntracked?.pct ?? 0).toFixed(1) + '%', 9, true)} | ` +
        `${pad(fmtBytes(report.unattributed.allocSiteUntracked?.retainedBytes ?? 0), 9, true)}\n`
    );

    function writeAllocTable(
      header: string,
      description: string,
      rowLabel: string,
      rows: PackageAllocRow[],
      unattrLabel: string,
      unattrBytes: number,
      unattrPct: number
    ): void {
      out.write('\n');
      out.write(header);
      out.write(description);
      out.write(
        `${pad(rowLabel, 55)} | ${pad('Allocated', 9, true)} | ${pad('Alloc MB', 9, true)}\n`
      );
      out.write(allocSep);
      let shown = 0;
      for (const row of rows) {
        if (row.allocPct < 0.05) continue;
        if (shown++ >= 60) break;
        out.write(
          `${pad(truncate(row.package, 55), 55)} | ` +
            `${pad(row.allocPct.toFixed(1) + '%', 9, true)} | ` +
            `${pad(fmtBytes(row.allocBytes), 9, true)}\n`
        );
      }
      out.write(
        `${pad(unattrLabel, 55)} | ` +
          `${pad(unattrPct.toFixed(1) + '%', 9, true)} | ` +
          `${pad(fmtBytes(unattrBytes), 9, true)}\n`
      );
      out.write(
        `${pad('(untracked: pre-tracking / native allocs)', 55)} | ` +
          `${pad(
            (report.unattributed.allocSiteUntracked?.pct ?? 0).toFixed(1) + '%',
            9,
            true
          )} | ` +
          `${pad(fmtBytes(report.unattributed.allocSiteUntracked?.retainedBytes ?? 0), 9, true)}\n`
      );
    }

    // --- Per-module allocation-site table (third-party libraries) ---
    writeAllocTable(
      `=== Allocated by Module (allocation site${filterSuffix}) ===\n`,
      "Walks each live node's allocation-time call stack to the first\n" +
        'package frame and reports rows for third-party `node_modules` libraries\n' +
        '(zod, joi, require-in-the-middle, etc.). Shows where allocator code lives.\n' +
        'For "which Kibana code triggered these allocations" see the Allocated\n' +
        'by Package table below.\n' +
        'Self bytes only — no Saved column (counterfactual is a graph property).\n' +
        (filterRegex
          ? `Filtered: only nodes whose deepest allocation frame matches\n` +
            `/${filterStr}/. Attribution walks past matched frames so bytes land on\n` +
            `the package that *called* the filtered code.\n\n`
          : '\n'),
      'Module',
      moduleAllocRows,
      '(no module frame in alloc stack)',
      report.unattributed.allocSiteModule?.retainedBytes ?? 0,
      report.unattributed.allocSiteModule?.pct ?? 0
    );

    // --- Per-package allocation-site table (Kibana @kbn/* packages) ---
    writeAllocTable(
      `=== Allocated by Package (allocation site${filterSuffix}) ===\n`,
      "Walks each live node's allocation-time call stack to the first\n" +
        '`@kbn/*` Kibana package frame, skipping third-party library frames.\n' +
        'Surfaces wrapper packages whose own code is small but which trigger\n' +
        'heavy library allocations (e.g. @kbn/connector-schemas appears here\n' +
        'with the zod bytes it allocated).\n' +
        'Self bytes only — no Saved column (counterfactual is a graph property).\n' +
        (filterRegex
          ? `Filtered: only nodes whose deepest allocation frame matches\n` +
            `/${filterStr}/. Attribution walks past matched frames so bytes land on\n` +
            `the package that *called* the filtered code.\n\n`
          : '\n'),
      'Package',
      pkgAllocRows,
      '(no @kbn/ package in alloc stack)',
      report.unattributed.allocSitePackage?.retainedBytes ?? 0,
      report.unattributed.allocSitePackage?.pct ?? 0
    );
  } else {
    out.write(
      '\n(Allocation-site table omitted — snapshot has no allocation tracking. ' +
        'Capture with the heap_track_preload.js helper to enable.)\n'
    );
  }

  // --- LLM analysis prompt ---
  out.write(
    '\n=== LLM Analysis Prompt ===\n' +
      'Paste the full report above into an LLM along with the prompt below.\n\n' +
      '---\n' +
      'You are analyzing a V8 heap snapshot from an idle Kibana Node.js server.\n' +
      'Goal: identify the most plausible ways to reduce **idle memory consumption**.\n' +
      '\n' +
      'Sections (all percentages are of root-retained heap):\n' +
      '\n' +
      '1. **Heap Breakdown by V8 Node Type** — bytes per object kind (string, closure,\n' +
      '   code, array, etc.).\n' +
      '\n' +
      '2. **Retained by Package** — per-npm-package view (anything matching `@kbn/*`\n' +
      '   or `node_modules/<name>`).\n' +
      '   - `Retained` — bytes attributed via direct evidence (node-name match +\n' +
      '     closure source-file match) propagated down the dominator tree.\n' +
      '     Deterministic; no heuristic guessing. A package with low Retained but\n' +
      '     high Saved is load-bearing infra (e.g. a schema library).\n' +
      '   - `Saved` — counterfactual: bytes that become unreachable from root if\n' +
      "     this package's directly-owned nodes are removed. Measured on the actual\n" +
      '     graph; the most authoritative answer to "what if this were gone?".\n' +
      '\n' +
      '3. **Retained by Plugin (dominator)** — same two columns rolled up to\n' +
      '   plugin packages (anything with `type: "plugin"` in `kibana.jsonc`).\n' +
      '   Tells you which plugin *holds* the memory via the retention graph.\n' +
      '   `(non-plugin: ...)` is everything else (core, shared libraries with no\n' +
      '   plugin ancestor in the dominator tree, V8 internals).\n' +
      '\n' +
      '4. **Allocated by Plugin (allocation site)** — present only if the snapshot\n' +
      "   was captured with V8 allocation tracking. Walks each live node's\n" +
      '   allocation-time call stack to the first plugin frame, so library memory\n' +
      '   (zod schemas, langchain objects) rolls up to the plugin that *caused*\n' +
      '   the allocation, not the dominator chain. This is the right view for\n' +
      '   "which team\'s code triggered this memory". `(no plugin frame in alloc\n' +
      '   stack)` = allocations under core/library code with no plugin ancestor.\n' +
      '   `(untracked)` = allocations made before tracking started or by native\n' +
      '   code that bypasses the JS allocator.\n' +
      '\n' +
      '5. **Allocated by Module (allocation site)** — same alloc-site walk, but\n' +
      '   reports rows for third-party `node_modules` libraries (zod, joi,\n' +
      '   require-in-the-middle, etc.). Tells you *where the allocator code lives*.\n' +
      '\n' +
      '6. **Allocated by Package (allocation site)** — same alloc-site walk, but\n' +
      '   reports rows for `@kbn/*` Kibana packages, skipping library frames so\n' +
      '   wrapper packages get credit for the library bytes they trigger\n' +
      '   (e.g. `@kbn/connector-schemas` shows up with the zod bytes its callers\n' +
      '   allocated). Tells you *which Kibana code triggered the allocations*.\n' +
      '\n' +
      'Interpretation is case-by-case. Compare (3) vs (4) to spot library cost\n' +
      'driven by a specific plugin: a package showing huge `Saved` in (2) plus a\n' +
      'matching team-side cost in (4) is a candidate for lazy-loading or schema\n' +
      'cleanup in that plugin. Compare (5) vs (6) to find thin Kibana wrappers\n' +
      'whose own bytes are tiny but which drive a heavy library line in (5) —\n' +
      'lazy-loading the wrapper recovers the library bytes too. Lead with what\n' +
      'is genuinely large or surprising. Skip generic advice.\n' +
      '---\n'
  );

  status(`\nTotal time: ${elapsed(t0)}`);
}
