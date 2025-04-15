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

export function mergeSecurityRequirements(
  resolvedDocuments: ResolvedDocument[]
): OpenAPIV3.SecurityRequirementObject[] | undefined {
  const securityArrayOfArrays = resolvedDocuments
    .filter(({ document }) => Array.isArray(document.security))
    .map(({ document }) => document.security as OpenAPIV3.SecurityRequirementObject[]);

  const merged = mergeArrays(securityArrayOfArrays);

  return merged.length > 0 ? merged : undefined;
}
