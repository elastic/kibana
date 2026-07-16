/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upperFirst, words } from 'lodash';

// Tech acronyms forced to all-caps: `upperFirst` title-cases each word (e.g.
// `http` -> `Http`), so acronyms need restoring after it runs.
const TECH_ACRONYMS = new Set([
  'AI',
  'API',
  'AWS',
  'CBOR',
  'CPU',
  'CSS',
  'CSV',
  'DB',
  'DNS',
  'ES',
  'GCP',
  'HITL',
  'HTML',
  'HTTP',
  'HTTPS',
  'ID',
  'IDS',
  'IOC',
  'IOCS',
  'IP',
  'IPS',
  'JSON',
  'KQL',
  'LLM',
  'MCP',
  'PDF',
  'SOC',
  'SQL',
  'SSH',
  'SSL',
  'TLS',
  'TTL',
  'UI',
  'URI',
  'URL',
  'UUID',
  'VT',
  'XML',
  'YAML',
  'YML',
]);

/**
 * Turn a step name into a display-friendly title (e.g. `send_slack_message` ->
 * `Send Slack Message`, `fetchUserData` -> `Fetch User Data`). Known tech
 * acronyms are restored to all-caps (e.g. `http_request` -> `HTTP Request`).
 *
 * Display-only: never assign the result back to `step.name` or `data.label` —
 * the raw label is used to look up execution status by step name.
 */
export const deslugifyStepName = (name: string): string => {
  const lower = name.toLowerCase();

  // `words` tokenizes camelCase boundaries, separators (`_`, `-`, spaces) and
  // digit runs into individual tokens, but cannot tell whether a digit run was
  // glued to the previous letters in the source (`s3` and `s_3` both become
  // `['s', '3']`). Re-glue a digit token onto the previous token only when the
  // pair was contiguous in the original name (no separator between them) —
  // `s3` -> `S3`, `s_3` -> `S 3`.
  //
  // Contiguity is determined by recording each token's start/end offset via a
  // monotonic cursor into `lower`: the pair is adjacent iff `prev.end === tok.start`.
  // A global `includes` check (previous approach) produces false positives when
  // the same letter+digit combination appears elsewhere in the string
  // (e.g. `s_3_and_s3` — `includes('s3')` is true due to the trailing token,
  // so the separated `s_3` would be wrongly glued into `S3`).
  let cursor = 0;
  const tokens = words(name).map((word) => {
    const start = lower.indexOf(word.toLowerCase(), cursor);
    const end = start + word.length;
    cursor = end;
    return { word, start, end };
  });

  return tokens
    .reduce<Array<{ word: string; start: number; end: number }>>((acc, tok) => {
      const last = acc[acc.length - 1];
      if (last !== undefined && /^\d+$/.test(tok.word) && last.end === tok.start) {
        last.word += tok.word;
        last.end = tok.end;
      } else {
        acc.push({ ...tok });
      }
      return acc;
    }, [])
    .map(({ word }) =>
      TECH_ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : upperFirst(word)
    )
    .join(' ');
};
