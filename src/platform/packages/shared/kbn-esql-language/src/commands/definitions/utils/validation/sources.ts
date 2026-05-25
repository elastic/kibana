/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSource } from '@elastic/esql/types';
import type { ICommandContext } from '../../../registry/types';
import { sourceExists, cleanIndex, removeSourceNameQuotes } from '../sources';
import { errors } from '../errors';
import type { ESQLMessage } from '../../types';

function hasWildcard(name: string) {
  return /\*/.test(name);
}

/**
 * Returns true if every comma-separated part of `sourceName` is either a known
 * hidden source or a dot-prefixed name (backing indices like `.ds-...` are hidden
 * in Elasticsearch but are not surfaced as individual entries in the sources list).
 */
function isHiddenOrBackingIndex(sourceName: string, hiddenSources: Set<string>): boolean {
  if (sourceExists(sourceName, hiddenSources)) {
    return true;
  }
  // Fallback: check each comma-separated part individually using the dot-prefix
  // heuristic — the only reliable way to identify backing indices that aren't
  // in the sources list (e.g. .ds-logs-default-000001).
  return sourceName.split(',').every((part) => {
    const cleaned = removeSourceNameQuotes(cleanIndex(part.trim()));
    // Strip optional CCS cluster prefix (cluster:indexName → indexName)
    const localName = cleaned.includes(':') ? cleaned.slice(cleaned.indexOf(':') + 1) : cleaned;
    return localName.startsWith('.');
  });
}

export interface ValidateSourcesOptions {
  /** When true, use "Unknown data source" error (e.g. for FROM). When false, use "Unknown index" (e.g. for TS). */
  useGenericDataSourceError?: boolean;
}

export function validateSources(
  sources: ESQLSource[],
  context?: ICommandContext,
  options?: ValidateSourcesOptions
) {
  const messages: ESQLMessage[] = [];
  const sourcesMap = new Set<string>([
    ...(context?.sources?.map((source) => source.name) ?? []),
    ...(context?.views?.map((view) => view.name) ?? []),
    ...(context?.datasets?.map((dataset) => dataset.name) ?? []),
  ]);
  const hiddenSources = new Set<string>(
    context?.sources?.filter((s) => s.hidden).map((s) => s.name) ?? []
  );
  const useGenericDataSourceError = options?.useGenericDataSourceError ?? false;

  for (const source of sources) {
    if (source.incomplete) {
      return messages;
    }

    if (source.sourceType === 'index') {
      const index = source.index;
      const sourceName = source.prefix ? source.name : index?.valueUnquoted;
      if (!sourceName) continue;

      if (
        !sourceExists(sourceName, sourcesMap) &&
        !hasWildcard(sourceName) &&
        !isHiddenOrBackingIndex(sourceName, hiddenSources)
      ) {
        messages.push(
          useGenericDataSourceError ? errors.unknownDataSource(source) : errors.unknownIndex(source)
        );
      }
    }
  }

  return messages;
}
