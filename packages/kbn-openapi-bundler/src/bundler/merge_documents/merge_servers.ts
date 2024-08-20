/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { mergeArrays } from './merge_arrays';

export function mergeServers(
  resolvedDocuments: ResolvedDocument[]
): OpenAPIV3.ServerObject[] | undefined {
  const serverObjArrayOfArrays = resolvedDocuments
    .filter(({ document }) => Array.isArray(document.servers))
    .map(({ document }) => document.servers as OpenAPIV3.ServerObject[]);

  const merged = mergeArrays(serverObjArrayOfArrays);

  return merged.length > 0 ? merged : undefined;
}
