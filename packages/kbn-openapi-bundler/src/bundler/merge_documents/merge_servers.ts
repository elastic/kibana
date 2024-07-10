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
  const merged: OpenAPIV3.ServerObject[] = [];

  for (const { document } of resolvedDocuments) {
    if (!Array.isArray(document.servers)) {
      continue;
    }

    mergeArrays(document.servers, merged);
  }

  return merged.length > 0 ? merged : undefined;
}
