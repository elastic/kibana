/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import {
  ConnectorActionInputSchemas,
  ConnectorInputSchemas,
  ConnectorSpecsInputSchemas,
  staticConnectors,
} from './connector_action_schema';
import { SystemConnectorsMap } from '../../common/constants';
import type { BaseConnectorContract, ConnectorContractUnion } from '../../types/v1';
import { getElasticsearchConnectors } from '../elasticsearch';
import { getKibanaConnectors } from '../kibana';

export {
  staticConnectors,
  ConnectorInputSchemas,
  ConnectorActionInputSchemas,
  ConnectorSpecsInputSchemas,
  ConnectorOutputSchemas,
  ConnectorActionOutputSchemas,
} from './connector_action_schema';

/**
 * Convert the ConnectorInputSchemas map (simple connectors with a single params schema,
 * e.g. `.slack`, `.http`) into BaseConnectorContract entries.
 */
const buildSimpleConnectorContracts = (): BaseConnectorContract[] => {
  const contracts: BaseConnectorContract[] = [];
  for (const [actionTypeId, paramsSchema] of ConnectorInputSchemas.entries()) {
    const connectorTypeName = actionTypeId.replace(/^\./, '');
    const hasConnectorId = SystemConnectorsMap.has(actionTypeId)
      ? ('optional' as const)
      : undefined;
    contracts.push({
      type: connectorTypeName,
      summary: connectorTypeName,
      paramsSchema,
      outputSchema: z.any(),
      description: null,
      ...(hasConnectorId !== undefined && { hasConnectorId }),
    });
  }
  return contracts;
};

/**
 * Convert the ConnectorActionInputSchemas map (connectors with named sub-actions,
 * e.g. `.inference` → `inference.completion`) into BaseConnectorContract entries.
 */
const buildSubActionConnectorContracts = (): BaseConnectorContract[] => {
  const contracts: BaseConnectorContract[] = [];
  for (const [actionTypeId, subActionMap] of ConnectorActionInputSchemas.entries()) {
    const connectorTypeName = actionTypeId.replace(/^\./, '');
    const hasConnectorId = SystemConnectorsMap.has(actionTypeId)
      ? ('optional' as const)
      : undefined;
    for (const [subActionName, paramsSchema] of Object.entries(subActionMap)) {
      contracts.push({
        type: `${connectorTypeName}.${subActionName}`,
        summary: `${connectorTypeName} - ${subActionName}`,
        paramsSchema,
        outputSchema: z.any(),
        description: null,
        ...(hasConnectorId !== undefined && { hasConnectorId }),
      });
    }
  }
  return contracts;
};

/**
 * Convert the ConnectorSpecsInputSchemas map (connector-specs connectors,
 * e.g. `.virustotal` → `virustotal.scanFileHash`) into BaseConnectorContract entries.
 */
const buildSpecsConnectorContracts = (): BaseConnectorContract[] => {
  const contracts: BaseConnectorContract[] = [];
  for (const [actionTypeId, subActionMap] of ConnectorSpecsInputSchemas.entries()) {
    const connectorTypeName = actionTypeId.replace(/^\./, '');
    const hasConnectorId = SystemConnectorsMap.has(actionTypeId)
      ? ('optional' as const)
      : undefined;
    for (const [subActionName, paramsSchema] of Object.entries(subActionMap)) {
      contracts.push({
        type: `${connectorTypeName}.${subActionName}`,
        summary: `${connectorTypeName} - ${subActionName}`,
        paramsSchema,
        outputSchema: z.any(),
        description: null,
        ...(hasConnectorId !== undefined && { hasConnectorId }),
      });
    }
  }
  return contracts;
};

let cache: ConnectorContractUnion[] | undefined;

/**
 * Returns the full static connector catalog — all step types the workflow
 * engine supports, without any dynamic connectors from the actions client.
 *
 * Suitable for use in CLI tooling and tests that need the full schema but
 * don't have a running Kibana instance.
 */
export const getAllStaticConnectors = (): ConnectorContractUnion[] => {
  if (cache) return cache;
  cache = [
    ...staticConnectors,
    ...getElasticsearchConnectors(),
    ...getKibanaConnectors(),
    ...buildSimpleConnectorContracts(),
    ...buildSubActionConnectorContracts(),
    ...buildSpecsConnectorContracts(),
  ];
  return cache;
};
