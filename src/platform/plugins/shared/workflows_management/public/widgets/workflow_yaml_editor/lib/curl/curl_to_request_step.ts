/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify, type ToStringOptions } from 'yaml';
import { GENERIC_REQUEST_SUB_ACTION } from '@kbn/connector-specs';
import { parseCurl, type ParsedCurl } from './parse_curl';
import {
  getConnectorSpecByType,
  resolveStaticBaseUrl,
} from '../connector_specs/resolve_static_base_url';

export interface CurlToRequestStepResult {
  ok: true;
  /** The full workflow step type, e.g. `slack.request`. */
  stepType: string;
  /** YAML for a single step-sequence item (leading `- name:` … block). */
  snippet: string;
  /** Human-readable notes to surface in the UI (stripped auth, path vs url, …). */
  notes: string[];
}

export interface CurlToRequestStepError {
  ok: false;
  error: string;
}

const YAML_OPTIONS: ToStringOptions = { indent: 2, lineWidth: 0 };

/**
 * Splits an absolute URL into the `path` (path + query + hash, relative to the
 * base URL) actually appended to a connector base URL. Returns `null` when the
 * URL does not sit under `baseUrl`, in which case the caller should fall back to
 * an absolute `url`.
 */
const toRelativePath = (absoluteUrl: string, baseUrl: string): string | null => {
  let base: URL;
  let target: URL;
  try {
    base = new URL(baseUrl);
    target = new URL(absoluteUrl);
  } catch {
    return null;
  }
  if (base.origin !== target.origin) {
    return null;
  }
  const basePath = base.pathname.replace(/\/+$/, '');
  if (basePath && !target.pathname.startsWith(basePath)) {
    return null;
  }
  const remainder = target.pathname.slice(basePath.length) || '/';
  const path = remainder.startsWith('/') ? remainder : `/${remainder}`;
  return `${path}${target.search}${target.hash}`;
};

/**
 * Builds the ordered `with` block for the generic request action. `url` and
 * `path` are mutually exclusive by construction here (path wins when the URL
 * resolves against a known base URL).
 */
const buildWithBlock = (
  parsed: ParsedCurl,
  relativePath: string | null
): Record<string, unknown> => {
  const withBlock: Record<string, unknown> = { method: parsed.method };
  if (relativePath !== null) {
    withBlock.path = relativePath;
  } else {
    withBlock.url = parsed.url;
  }
  if (parsed.body !== undefined) {
    withBlock.body = parsed.body;
  }
  if (Object.keys(parsed.headers).length > 0) {
    withBlock.headers = parsed.headers;
  }
  return withBlock;
};

const buildNotes = (parsed: ParsedCurl, relativePath: string | null): string[] => {
  const notes: string[] = [];
  const strippedNames = [...parsed.strippedAuth.headerNames];
  if (parsed.strippedAuth.hadUserFlag) {
    strippedNames.push('basic auth (-u)');
  }
  if (strippedNames.length > 0) {
    notes.push(
      `Removed authentication (${strippedNames.join(
        ', '
      )}) — the connector supplies its own credentials.`
    );
  }
  if (relativePath !== null) {
    notes.push('Matched the connector base URL, so a relative `path` was used.');
  } else {
    notes.push('Could not match a connector base URL, so an absolute `url` was used.');
  }
  return notes;
};

/**
 * Converts a raw cURL command into a workflow `request`-step snippet for the
 * given connector. When the connector exposes a statically resolvable base URL
 * and the pasted URL sits under it, the step uses a relative `path`; otherwise
 * it falls back to an absolute `url`. Auth headers are stripped (the connector
 * injects its own credentials).
 */
export const curlToRequestStep = (
  connectorType: string,
  rawCurl: string
): CurlToRequestStepResult | CurlToRequestStepError => {
  const parseResult = parseCurl(rawCurl);
  if (!parseResult.ok) {
    return { ok: false, error: parseResult.error };
  }
  const parsed = parseResult.value;

  const spec = getConnectorSpecByType(connectorType);
  const baseUrl = spec ? resolveStaticBaseUrl(spec) : null;
  const relativePath = baseUrl ? toRelativePath(parsed.url, baseUrl) : null;

  const stepType = `${connectorType.replace(/^\./, '')}.${GENERIC_REQUEST_SUB_ACTION}`;
  const withBlock = buildWithBlock(parsed, relativePath);

  const step = [
    {
      name: `${stepType.replaceAll('.', '_')}_step`,
      type: stepType,
      'connector-id': '# Enter connector UUID here',
      with: withBlock,
    },
  ];

  const snippet = stringify(step, YAML_OPTIONS);

  return {
    ok: true,
    stepType,
    snippet,
    notes: buildNotes(parsed, relativePath),
  };
};
