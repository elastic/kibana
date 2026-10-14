/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  generateOpenApiDocument,
  type GenerateOpenApiDocumentOptionsFilters,
} from './src/generate_oas';

export { OasSchemaCollisionError } from './src/oas_converter';

// Writes the operation-level `x-state` string. Exported so @kbn/api-contracts can
// round-trip it in a test: the contract checker's parseXState decodes exactly
// what this produces, and that test fails loudly if the wording here ever drifts.
export { getXState } from './src/util';
