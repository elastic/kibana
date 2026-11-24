/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATADOG_CONNECTOR_TYPE_ID } from './specs/datadog/constants';

/**
 * Dual connector types that can receive events with no outbound credentials.
 *
 * An id belongs here only when all three are in place:
 * - the served spec includes the `none` auth type
 * - create, update, and execute reject `none` unless `selectedActions` is empty
 * - the connector form shows the Run actions switch and hides No authentication
 *
 * Add the next type here once its spec, validator, and form are ready.
 */
export const RECEIVE_ONLY_CONNECTOR_TYPE_IDS = [DATADOG_CONNECTOR_TYPE_ID] as const;

export type ReceiveOnlyConnectorTypeId = (typeof RECEIVE_ONLY_CONNECTOR_TYPE_IDS)[number];

/** True when this connector type is opted into receive-only auth, validation, and form behavior. */
export const connectorTypeSupportsReceiveOnly = (actionTypeId: string): boolean =>
  (RECEIVE_ONLY_CONNECTOR_TYPE_IDS as readonly string[]).includes(actionTypeId);
