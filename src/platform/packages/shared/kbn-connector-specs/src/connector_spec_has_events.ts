/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { getConnectorSpec } from './get_connector_spec';

/** True when the spec declares inbound event definitions (inbound-only or dual). */
export const connectorSpecHasEvents = (spec: ConnectorSpec): boolean =>
  spec.events !== undefined && Object.keys(spec.events.definitions).length > 0;

/** True when the registered spec for this type id accepts inbound hub events. */
export const connectorTypeHasInboundEvents = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && connectorSpecHasEvents(spec);
};
