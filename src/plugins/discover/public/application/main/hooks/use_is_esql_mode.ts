/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataSourceType, isDataSourceType } from '../../../../common/data_sources';
import { useAppStateSelector } from '../state_management/discover_app_state_container';

export const useIsEsqlMode = () => {
  const dataSource = useAppStateSelector((state) => state.dataSource);
  return isDataSourceType(dataSource, DataSourceType.Esql);
};
