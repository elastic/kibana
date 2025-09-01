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
import { useMemo } from 'react';
import { getWorkflowZodSchemaFromConnectorConfig } from '../../../../common/schema';
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
    return getWorkflowZodSchemaFromConnectorConfig(connectorConfig, loose);
  }, [connectorConfig, loose]);
};
