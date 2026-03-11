/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ENHANCED_ELASTICSEARCH_CONNECTORS,
  mergeEnhancedConnectors,
} from './enhanced_es_connectors';
import type { InternalConnectorContract } from '../../types/latest';

/**
 * Elasticsearch Connector Generation
 *
 * This system provides ConnectorContract[] for all Elasticsearch APIs
 * by using pre-generated definitions from Console's API specifications.
 *
 * Benefits:
 * 1. **Schema Validation**: Zod schemas for all ES API parameters
 * 2. **Autocomplete**: Monaco YAML editor gets full autocomplete via JSON Schema
 * 3. **Comprehensive Coverage**: 568 Elasticsearch APIs supported
 * 4. **Browser Compatible**: No file system access required
 * 5. **Lazy Loading**: Large generated files are only loaded when needed, reducing main bundle size
 *
 * The generated connectors include:
 * - All Console API definitions converted to Zod schemas
 * - Path parameters extracted from patterns (e.g., {index}, {id})
 * - URL parameters with proper types (flags, enums, strings, numbers)
 * - Proper ConnectorContract format for workflow execution
 *
 * To regenerate: run 'node scripts/generate_workflow_es_contracts.js' from kibana root
 */
export function getElasticsearchConnectors(): InternalConnectorContract[] {
  // Lazy load the large generated files to keep them out of the main bundle
  const {
    GENERATED_ELASTICSEARCH_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./generated');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ELASTICSEARCH_OVERRIDES } = require('./overrides');

  const connectors: InternalConnectorContract[] = [];

  for (const connector of GENERATED_ELASTICSEARCH_CONNECTORS) {
    const override = ELASTICSEARCH_OVERRIDES[connector.type];
    if (override) {
      connectors.push(override);
    } else {
      connectors.push(connector);
    }
  }

  return mergeEnhancedConnectors(connectors, ENHANCED_ELASTICSEARCH_CONNECTORS);
}
