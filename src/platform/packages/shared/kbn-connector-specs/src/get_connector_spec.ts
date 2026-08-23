/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';

const runtimeConnectorSpecs = new Map<string, ConnectorSpec>();

/**
 * Replaces the process-local runtime connector specifications. This is used by
 * the development catalog PoC so consumers such as Workflows can resolve the
 * same action input schemas as the Actions runtime.
 */
export function setRuntimeConnectorSpecs(specs: ConnectorSpec[]): void {
  runtimeConnectorSpecs.clear();
  for (const spec of specs) {
    runtimeConnectorSpecs.set(spec.metadata.id, spec);
  }
}

/**
 * Returns the ConnectorSpec for a given connector type ID, or undefined if not found.
 */
export function getConnectorSpec(connectorTypeId: string): ConnectorSpec | undefined {
  const runtimeSpec = runtimeConnectorSpecs.get(connectorTypeId);
  if (runtimeSpec) return runtimeSpec;
  const specEntries = Object.values(connectorsSpecs);
  return specEntries.find((s) => s.metadata.id === connectorTypeId);
}
