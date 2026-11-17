/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorSpec } from '@kbn/connector-specs';

/**
 * Whether `stepType` is one of the stock, spec-defined Kibana connector types (slack, jira,
 * webhook, ...). `@kbn/connector-specs` is already loaded by the floor (every worker needs it to
 * execute any connector step, `ConnectorStepImpl`'s own use of this same check), so a step of this
 * type needs no `workflow-steps` pack: its executor is the actions plugin's own, reached through
 * `ConnectorExecutor`, not a pack-registered custom step. Shared by `ConnectorStepImpl` (to decide
 * how to shape its request) and `resolvePacksForDefinition` (to avoid a false "uncovered" that
 * would otherwise make a workflow using nothing but stock connectors load every pack).
 */
export const isSpecConnectorStepType = (stepType: string): boolean =>
  getConnectorSpec(`.${stepType}`) !== undefined;
