/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { useMemo } from 'react';
import { getConnectorContracts } from '../../../../common/schema';
import type { ConnectorConfig } from '../../../../common';

export const useWorkflowYamlZodSchema = ({ loose }: { loose: boolean }) => {
  const { http } = useKibana().services;

  const { data: connectorConfig } = useQuery({
    queryKey: ['connectorConfig'],
    queryFn: () => http!.get<ConnectorConfig>('/api/workflows/connectorConfig'),
  });

  return useMemo(() => {
    if (!connectorConfig) {
      return null;
    }
    // Add special non-connector step types
    const types = [...connectorConfig.types, '_console'];
    const contracts = types.map((type) =>
      getConnectorContracts(type, connectorConfig.nameMap[type])
    );
    const connectorContracts = contracts.flat();
    return generateYamlSchemaFromConnectors(connectorContracts as ConnectorContract[], loose);
  }, [connectorConfig, loose]);
};
