/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Re-exports the connector catalog from @kbn/workflows.
// The actual schema definitions live in @kbn/workflows/spec/connectors/ so
// that CLI tooling and tests can consume them without importing the full plugin.
// This shim preserves the lazy-require() pattern in schema.ts (see #264175).
export {
  staticConnectors,
  ConnectorInputSchemas,
  ConnectorActionInputSchemas,
  ConnectorSpecsInputSchemas,
  ConnectorOutputSchemas,
  ConnectorActionOutputSchemas,
} from '@kbn/workflows';
