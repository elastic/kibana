/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import type { ActionsClient, IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { FindActionResult } from '@kbn/actions-plugin/server/types';
import { connectorSpecHasEvents, connectorsSpecs } from '@kbn/connector-specs';
import type { KibanaRequest } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import type {
  ConnectorInstanceConfig,
  GetAvailableConnectorsResponse,
} from '@kbn/workflows/types/v1';

import { CONNECTOR_SUB_ACTIONS_MAP } from '../../../common/connector_sub_actions_map';

const eventConnectorTypeIds = new Set(
  Object.values(connectorsSpecs)
    .filter(connectorSpecHasEvents)
    .map((spec) => spec.metadata.id)
);

type ListedActionType = Awaited<ReturnType<PublicMethodsOf<ActionsClient>['listTypes']>>[number];

const toConnectorTypeInfo = (actionType: ListedActionType): ConnectorTypeInfo => {
  const subActions = CONNECTOR_SUB_ACTIONS_MAP[actionType.id];
  return {
    actionTypeId: actionType.id,
    displayName: actionType.name,
    instances: [],
    enabled: actionType.enabled,
    enabledInConfig: actionType.enabledInConfig,
    enabledInLicense: actionType.enabledInLicense,
    minimumLicenseRequired: actionType.minimumLicenseRequired,
    ...(subActions && { subActions }),
  };
};

const getConnectorInstanceConfig = (
  connector: FindActionResult
): { config: ConnectorInstanceConfig } | undefined => {
  if (connector.actionTypeId === '.inference') {
    return { config: { taskType: connector.config?.taskType } };
  }
  return undefined;
};

/**
 * Lists all available connector action types and their instances for the workflows feature.
 */
export const getAvailableConnectors = async (params: {
  getActionsClient: () => Promise<IUnsecuredActionsClient>;
  getActionsClientWithRequest: (request: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>;
  spaceId: string;
  request: KibanaRequest;
}): Promise<GetAvailableConnectorsResponse> => {
  const { getActionsClient, getActionsClientWithRequest, spaceId, request } = params;
  const actionsClient = await getActionsClient();
  const actionsClientWithRequest = await getActionsClientWithRequest(request);

  const [connectors, actionTypes] = await Promise.all([
    actionsClient.getAll(spaceId),
    actionsClientWithRequest.listTypes({
      featureId: WorkflowsConnectorFeatureId,
      includeSystemActionTypes: false,
    }),
  ]);

  const connectorTypes: Record<string, ConnectorTypeInfo> = {};

  actionTypes.forEach((actionType) => {
    connectorTypes[actionType.id] = toConnectorTypeInfo(actionType);
  });

  const missingEventTypeIds = [...eventConnectorTypeIds].filter((id) => !connectorTypes[id]);
  if (missingEventTypeIds.length > 0) {
    const allActionTypes = await actionsClientWithRequest.listTypes({
      includeSystemActionTypes: false,
    });
    for (const actionType of allActionTypes) {
      if (missingEventTypeIds.includes(actionType.id)) {
        connectorTypes[actionType.id] = toConnectorTypeInfo(actionType);
      }
    }
  }

  connectors.forEach((connector: FindActionResult) => {
    if (connectorTypes[connector.actionTypeId]) {
      connectorTypes[connector.actionTypeId].instances.push({
        id: connector.id,
        name: connector.name,
        isPreconfigured: connector.isPreconfigured,
        isDeprecated: connector.isDeprecated,
        ...getConnectorInstanceConfig(connector),
      });
    }
  });

  return { connectorTypes, totalConnectors: connectors.length };
};
