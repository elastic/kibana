/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validate as validateUuid } from 'uuid';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import type { KibanaRequest } from '@kbn/core/server';

export async function resolveConnectorId(
  nameOrId: string,
  actionsPlugin: ActionsPluginStartContract,
  kibanaRequest: KibanaRequest
): Promise<string> {
  if (validateUuid(nameOrId)) {
    return nameOrId;
  }

  const scopedActionsClient = await actionsPlugin.getActionsClientWithRequest(kibanaRequest);

  const allConnectors = await scopedActionsClient.getAll();

  const connector = allConnectors.find((c: ConnectorWithExtraFindData) => c.name === nameOrId);

  if (!connector) {
    throw new Error(`Connector with name ${nameOrId} not found`);
  }

  return connector.id;
}
