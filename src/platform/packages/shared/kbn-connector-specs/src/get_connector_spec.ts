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
import { SshHost } from './specs/ssh_host/ssh_host';

/**
 * Specs for connector types that a hand-written stack connector already registers.
 * Kept out of `all_specs` so they are not registered again as a second action type.
 * Agent Builder still reads them for attachment text and tool sub-actions.
 */
const specsForExistingConnectors: ConnectorSpec[] = [SshHost];

/**
 * Returns the ConnectorSpec for a given connector type ID, or undefined if not found.
 */
export function getConnectorSpec(connectorTypeId: string): ConnectorSpec | undefined {
  return (
    Object.values(connectorsSpecs).find((spec) => spec.metadata.id === connectorTypeId) ??
    specsForExistingConnectors.find((spec) => spec.metadata.id === connectorTypeId)
  );
}
