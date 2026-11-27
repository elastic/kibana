/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NO_AUTH_TYPE_ID } from './auth_types/none';

type ReceiveOnlyConnectorValidator = (
  config: Record<string, unknown>,
  secrets: Record<string, unknown>
) => string | null;

/**
 * With no authentication an opted-in dual connector can only receive events, so every outbound
 * action must be turned off (`selectedActions: []`). `createConnectorTypeFromSpec` installs this
 * for ids in `RECEIVE_ONLY_CONNECTOR_TYPE_IDS`.
 */
export const createReceiveOnlyConnectorValidator =
  (connectorName: string): ReceiveOnlyConnectorValidator =>
  (config, secrets) => {
    const { selectedActions } = config;
    if (
      secrets.authType === NO_AUTH_TYPE_ID &&
      !(Array.isArray(selectedActions) && selectedActions.length === 0)
    ) {
      return `A ${connectorName} connector with no authentication can only receive events. Set selectedActions to an empty list, or add credentials.`;
    }
    return null;
  };
