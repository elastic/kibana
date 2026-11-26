/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { connectorSpecHasEvents } from './connector_spec_has_events';
import { getConnectorSpec } from './get_connector_spec';

/**
 * Inbound-only types have events and no outbound actions.
 */
export const isInboundOnlyConnectorSpec = (spec: ConnectorSpec): boolean =>
  connectorSpecHasEvents(spec) && Object.keys(spec.actions).length === 0;

/** True when the registered spec for this type id is inbound-only. */
export const connectorTypeIsInboundOnly = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && isInboundOnlyConnectorSpec(spec);
};
