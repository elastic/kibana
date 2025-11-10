/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { ConnectorInstance, ConnectorTypeInfo } from '@kbn/workflows';
import { selectConnectors } from '../../workflows/store/workflow_detail/selectors';

export const useAvailableConnectors = () => useSelector(selectConnectors);

/**
 * Helper hook to get connector instances for a specific action type
 */
export function useConnectorInstances(actionTypeId: string): ConnectorInstance[] {
  const data = useAvailableConnectors();
  return useMemo(
    () => data?.connectorTypes[actionTypeId]?.instances || [],
    [data?.connectorTypes, actionTypeId]
  );
}

/**
 * Helper hook to get all available connector types (for schema generation)
 */
export function useConnectorTypes(): ConnectorTypeInfo[] {
  const data = useAvailableConnectors();
  return useMemo(() => Object.values(data?.connectorTypes ?? {}), [data?.connectorTypes]);
}
