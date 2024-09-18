/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDiscoverCustomization } from '../../../../customizations';
import { getLogsVirtualColumnsConfiguration } from './logs';

export * from './logs';

export const useContextualGridCustomisations = () => {
  const { data } = useDiscoverServices();
  // TODO / NOTE: This will eventually rely on Discover's context resolution to determine which fields
  // are returned based on the data type.
  const isLogsContext = useDiscoverCustomization('data_table')?.logsEnabled;

  const virtualColumnsConfiguration = useMemo(() => {
    if (!isLogsContext) return null;
    if (isLogsContext) return getLogsVirtualColumnsConfiguration(data);
  }, [data, isLogsContext]);

  return virtualColumnsConfiguration;
};
