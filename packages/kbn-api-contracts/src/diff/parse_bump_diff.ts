/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from './breaking_rules';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export interface BumpDiffEntry {
  id: string;
  name: string;
  type: string;
  status: string;
  breaking?: boolean;
  breaking_details?: {
    message_key?: string;
    breaking_attributes?: string[];
  };
  children?: BumpDiffEntry[];
  current?: Record<string, unknown>;
  previous?: Record<string, unknown>;
  subtype?: string | null;
}

const parseOperationName = (name: string): { method?: string; path: string } => {
  const spaceIdx = name.indexOf(' ');
  if (spaceIdx > 0) {
    const candidate = name.slice(0, spaceIdx);
    if (HTTP_METHODS.has(candidate)) {
      return { method: candidate, path: name.slice(spaceIdx + 1).trimStart() };
    }
  }
  return { path: name };
};

const collectBreakingReasons = (children: BumpDiffEntry[]): string[] =>
  children.flatMap((child) => {
    if (!child.breaking) {
      return child.children?.length ? collectBreakingReasons(child.children) : [];
    }

    const reasons: string[] = [];
    const attrs = child.breaking_details?.breaking_attributes;

    if (attrs?.includes('required')) {
      reasons.push(`${child.type} '${child.name}' became required`);
    } else if (child.status === 'removed') {
      reasons.push(`property '${child.name}' removed`);
    } else {
      reasons.push(`${child.type} '${child.name}' ${child.status}`);
    }

    if (child.children?.length) {
      reasons.push(...collectBreakingReasons(child.children));
    }

    return reasons;
  });

const mapEntryToBreakingChange = (entry: BumpDiffEntry): BreakingChange | null => {
  const { method, path } = parseOperationName(entry.name);

  if (entry.status === 'removed' && entry.breaking) {
    return {
      type: method ? 'method_removed' : 'path_removed',
      path,
      method,
      reason: method ? 'HTTP method removed' : 'Endpoint removed',
    };
  }

  if (entry.status === 'modified' && entry.children?.length) {
    const reasons = collectBreakingReasons(entry.children);
    if (reasons.length > 0) {
      return {
        type: 'operation_breaking',
        path,
        method,
        reason: reasons.join(', '),
      };
    }
  }

  return null;
};

export const parseBumpDiff = (json: BumpDiffEntry[]): BreakingChange[] =>
  json.map(mapEntryToBreakingChange).filter((c): c is BreakingChange => c !== null);
