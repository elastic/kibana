/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorSpec } from './get_connector_spec';

/**
 * Returns the workflow YAML template strings for a connector type.
 *
 * Returns an empty array if the connector type has no workflows or doesn't exist.
 */
export function getWorkflowTemplatesForConnector(connectorTypeId: string): string[] {
  return getConnectorSpec(connectorTypeId)?.agentBuilderWorkflows ?? [];
}
