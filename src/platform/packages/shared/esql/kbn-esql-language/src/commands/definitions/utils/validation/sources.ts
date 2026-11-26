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
import { cleanIndex, removeSourceNameQuotes, sourceExists } from '../sources';
import { errors } from '../errors';
import type { ESQLMessage } from '../../types';

function hasWildcard(name: string) {
  return /\*/.test(name);
}

/**
 * Returns true when every comma-separated part of `sourceName` starts with a dot.
 * Covers backing indices like `.ds-logs-default-000001` that are hidden in Elasticsearch
 * but are never surfaced as individual entries in the sources list.
 */
export function isDotPrefixedSource(sourceName: string): boolean {
  return sourceName.split(',').every((part) => {
    const cleaned = removeSourceNameQuotes(cleanIndex(part.trim()));
    // Strip optional CCS cluster prefix (cluster:indexName → indexName)
    let localName = cleaned.includes(':') ? cleaned.slice(cleaned.indexOf(':') + 1) : cleaned;
    // Clean quotes that may appear after CCS prefix extraction
    localName = removeSourceNameQuotes(localName);
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
        !isDotPrefixedSource(sourceName)
      ) {
        messages.push(
          useGenericDataSourceError ? errors.unknownDataSource(source) : errors.unknownIndex(source)
        );
      }
    }
  }

  return messages;
}
