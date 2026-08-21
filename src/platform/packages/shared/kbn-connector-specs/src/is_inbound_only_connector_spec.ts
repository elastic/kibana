/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';

/**
 * Inbound-only types have events and no outbound actions. Dual connectors
 * (actions + events) are not inbound-only and stay registered when inbound
 * events are disabled so steps still work.
 */
export const isInboundOnlyConnectorSpec = (spec: ConnectorSpec): boolean =>
  spec.events !== undefined &&
  Object.keys(spec.events.definitions).length > 0 &&
  Object.keys(spec.actions).length === 0;
