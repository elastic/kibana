/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorSpecHasEvents } from './connector_spec_has_events';
import { getConnectorSpec } from './get_connector_spec';
import { isDualConnectorSpec } from './is_dual_connector_spec';
import { isInboundOnlyConnectorSpec } from './is_inbound_only_connector_spec';

/** True when the registered spec for this type id accepts inbound hub events. */
export const connectorTypeHasInboundEvents = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && connectorSpecHasEvents(spec);
};

/** True when the registered spec for this type id is inbound-only. */
export const connectorTypeIsInboundOnly = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && isInboundOnlyConnectorSpec(spec);
};

/** True when the registered spec for this type id is dual (events + actions). */
export const connectorTypeIsDual = (actionTypeId: string): boolean => {
  const spec = getConnectorSpec(actionTypeId);
  return spec !== undefined && isDualConnectorSpec(spec);
};

/** True when the registered spec for this type id signs with a Kibana-managed key. */
export const connectorTypePublishesKeys = (actionTypeId: string): boolean =>
  getConnectorSpec(actionTypeId)?.signingKey !== undefined;
