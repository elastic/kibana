/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** MCP meta sub-actions that are always available and not user-restrictable. */
export const CONNECTOR_META_SUB_ACTIONS = ['listTools', 'callTool'] as const;

export type ConnectorMetaSubAction = (typeof CONNECTOR_META_SUB_ACTIONS)[number];

const connectorMetaSubActionSet = new Set<string>(CONNECTOR_META_SUB_ACTIONS);

export const isConnectorMetaSubAction = (
  subAction: string
): subAction is ConnectorMetaSubAction => connectorMetaSubActionSet.has(subAction);

export const partitionToolSubActions = (
  toolSubActions: readonly string[]
): { metaSubActions: string[]; restrictableSubActions: string[] } => {
  const metaSubActions: string[] = [];
  const restrictableSubActions: string[] = [];

  for (const subAction of toolSubActions) {
    if (isConnectorMetaSubAction(subAction)) {
      metaSubActions.push(subAction);
    } else {
      restrictableSubActions.push(subAction);
    }
  }

  return { metaSubActions, restrictableSubActions };
};

export const isConnectorSubActionAllowed = (
  subAction: string,
  allowedSubActions: readonly string[] | undefined
): boolean =>
  allowedSubActions === undefined ||
  isConnectorMetaSubAction(subAction) ||
  allowedSubActions.includes(subAction);
