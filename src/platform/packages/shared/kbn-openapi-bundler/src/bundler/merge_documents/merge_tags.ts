/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenAPIV3 } from 'openapi-types';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { mergeArrays } from './merge_arrays';

export function mergeTags(
  resolvedDocuments: ResolvedDocument[]
): OpenAPIV3.TagObject[] | undefined {
  const tagsArrayOfArrays = resolvedDocuments
    .filter(({ document }) => Array.isArray(document.tags))
    .map(({ document }) => document.tags as OpenAPIV3.TagObject[]);

  const merged = mergeArrays(tagsArrayOfArrays);

  if (merged.length === 0) {
    return;
  }

  // To streamline API endpoints categorization it's expected that
  // tags are sorted alphabetically by name
  merged.sort((a, b) => getTagName(a).localeCompare(getTagName(b)));

  return merged;
}

function getTagName(tag: OpenAPIV3.TagObject): string {
  return 'x-displayName' in tag && typeof tag['x-displayName'] === 'string'
    ? tag['x-displayName']
    : tag.name;
}
