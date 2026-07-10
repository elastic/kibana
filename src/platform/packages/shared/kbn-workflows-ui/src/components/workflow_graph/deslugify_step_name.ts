/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { startCase } from 'lodash';

// Tech acronyms forced to all-caps: `startCase` title-cases every word (e.g.
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
  const lowerName = name.toLowerCase();

  // `startCase` always splits a digit run into its own word, even when it's
  // glued directly onto the preceding letters with no separator in the source
  // (e.g. `s3` -> `S 3`). Rejoin such a pair only when that exact token is a
  // contiguous substring of the original name; leave explicitly separated
  // digits (e.g. `s_3`) alone.
  const titled = startCase(name).replace(/([A-Za-z]+) (\d+)/g, (match, letters, digits) =>
    lowerName.includes((letters + digits).toLowerCase()) ? letters + digits : match
  );

  return titled
    .split(' ')
    .map((word) => (TECH_ACRONYMS.has(word.toUpperCase()) ? word.toUpperCase() : word))
    .join(' ');
};
