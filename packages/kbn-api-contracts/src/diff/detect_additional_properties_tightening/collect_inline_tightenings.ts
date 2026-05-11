/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { OasdiffEntry } from '../parse_oasdiff';
import { isRecord } from '../is_record';
import { collectTighteningsInSchemaDiff } from './collect_tightenings_in_schema_diff';
import { buildEntry } from './build_entry';
import { makeSkipKey } from './make_skip_key';
import type { SkipKey } from './types';

interface InlineSchemaContext {
  path: string;
  upperMethod: string;
  mediaType: string;
  schema: unknown;
}

const inlineSchemaContexts = (structuralDiff: unknown): InlineSchemaContext[] => {
  const modifiedPaths = get(structuralDiff, ['paths', 'modified']);
  if (!isRecord(modifiedPaths)) return [];

  return Object.entries(modifiedPaths).flatMap(([path, pathEntry]) => {
    const opsModified = get(pathEntry, ['operations', 'modified']);
    if (!isRecord(opsModified)) return [];

    return Object.entries(opsModified).flatMap(([method, opEntry]) => {
      const contentModified = get(opEntry, ['requestBody', 'content', 'modified']);
      if (!isRecord(contentModified)) return [];

      const upperMethod = method.toUpperCase();
      return Object.entries(contentModified)
        .map(([mediaType, mediaDiff]) => ({
          path,
          upperMethod,
          mediaType,
          schema: get(mediaDiff, 'schema'),
        }))
        .filter((ctx) => isRecord(ctx.schema));
    });
  });
};

export const collectInlineTightenings = (
  structuralDiff: unknown,
  skipKeys: Set<SkipKey>
): OasdiffEntry[] =>
  inlineSchemaContexts(structuralDiff).flatMap(({ path, upperMethod, mediaType, schema }) =>
    collectTighteningsInSchemaDiff(schema, '')
      .filter((pointer) => !skipKeys.has(makeSkipKey(path, upperMethod, pointer)))
      .map((pointer) =>
        buildEntry({
          path,
          method: upperMethod,
          source: `/requestBody/content/${mediaType}/schema${pointer}`,
        })
      )
  );
