/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalConnectorContract } from '../../types/latest';

export function getKibanaConnectors(): InternalConnectorContract[] {
  // TODO: bring the kibana connectors back, with the new approach to schemas generation
  // Lazy load the generated Kibana connectors
  // FIX: this is not really a lazy load, we should use a dynamic import instead
  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./generated');

  const {
    KIBANA_OVERRIDES,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./overrides');

  const mergedConnectors: InternalConnectorContract[] = [];
  for (const connector of GENERATED_KIBANA_CONNECTORS) {
    if (KIBANA_OVERRIDES[connector.type]) {
      mergedConnectors.push(KIBANA_OVERRIDES[connector.type]);
    } else {
      mergedConnectors.push(connector);
    }
  }

  return mergedConnectors;
}
