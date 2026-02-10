/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage, ESQLSource } from '../../../../types';
import type { ICommandContext } from '../../../registry/types';
import { sourceExists } from '../sources';
import { errors } from '../errors';

function hasWildcard(name: string) {
  return /\*/.test(name);
}

export interface ValidateSourcesOptions {
  /** When true, use "Unknown index or view" error (e.g. for FROM). When false, use "Unknown index" (e.g. for TS). */
  useIndexOrViewError?: boolean;
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
  ]);
  const useIndexOrViewError = options?.useIndexOrViewError ?? false;

  for (const source of sources) {
    if (source.incomplete) {
      return messages;
    }

    if (source.sourceType === 'index') {
      const index = source.index;
      const sourceName = source.prefix ? source.name : index?.valueUnquoted;
      if (!sourceName) continue;

      if (!sourceExists(sourceName, sourcesMap) && !hasWildcard(sourceName)) {
        messages.push(
          useIndexOrViewError ? errors.unknownIndexOrView(source) : errors.unknownIndex(source)
        );
      }
    }
  }

  return messages;
}
