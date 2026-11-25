/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connectorTypeIsDual } from './is_dual_connector_spec';
import type { SelectedActions } from './selected_actions';

/** Reserved connector config key. `false` means a dual connector does not run outbound actions. */
export const OUTBOUND_ENABLED_CONFIG_KEY = 'outboundEnabled';

export interface ConnectorOutboundState {
  actionTypeId: string;
  config?: Record<string, unknown> | null;
  /** Top-level API field. Wins over the config key when it is a boolean. */
  isOutboundActionsEnabled?: boolean;
}

/**
 * Whether a connector runs outbound actions.
 * Only dual types can turn outbound off. A missing key means on.
 */
export const isConnectorOutboundActionsEnabled = ({
  actionTypeId,
  config,
  isOutboundActionsEnabled,
}: ConnectorOutboundState): boolean => {
  if (typeof isOutboundActionsEnabled === 'boolean') {
    return isOutboundActionsEnabled;
  }
  if (!connectorTypeIsDual(actionTypeId)) {
    return true;
  }
  return config?.[OUTBOUND_ENABLED_CONFIG_KEY] !== false;
};

/** The saved action selection of a connector, or an empty list when outbound is off. */
export const getUsableSelectedActions = (connector: ConnectorOutboundState): SelectedActions => {
  if (!isConnectorOutboundActionsEnabled(connector)) {
    return [];
  }
  const selected = connector.config?.selectedActions;
  return Array.isArray(selected) ? (selected as string[]) : undefined;
};
