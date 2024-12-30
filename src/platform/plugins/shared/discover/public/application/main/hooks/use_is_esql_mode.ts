/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useInternalStateSelector } from '../state_management/discover_internal_state_container';
import { DataSourceType, isDataSourceType } from '../../../../common/data_sources';

export const useIsEsqlMode = () => {
  const dataSource = useInternalStateSelector((state) => state.appState?.dataSource);
  return isDataSourceType(dataSource, DataSourceType.Esql);
};
