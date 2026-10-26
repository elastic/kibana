/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from './common';

export * as connectorsSpecs from './src/all_specs';
export { getConnectorSpec } from './src/get_connector_spec';
export {
  connectorSpecHasEvents,
  connectorTypeHasInboundEvents,
} from './src/connector_spec_has_events';
export {
  isInboundOnlyConnectorSpec,
  connectorTypeIsInboundOnly,
} from './src/is_inbound_only_connector_spec';
export { isDualConnectorSpec, connectorTypeIsDual } from './src/is_dual_connector_spec';
export { connectorTypePublishesKeys } from './src/connector_type_publishes_keys';
export { isEarsExperimentalConnector } from './src/lib/ears_experimental_utils';
