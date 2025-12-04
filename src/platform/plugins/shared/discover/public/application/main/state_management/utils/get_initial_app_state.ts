/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState } from '../redux';
import { isEsqlSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { handleSourceColumnState } from '../../../../utils/state_helpers';
import { getStateDefaults } from './get_state_defaults';

export function getInitialAppState({
  initialUrlState,
  persistedTab,
  dataView,
  services,
}: {
  initialUrlState: DiscoverAppState | undefined;
  persistedTab: DiscoverSessionTab | undefined;
  dataView: DataView | undefined;
  services: DiscoverServices;
}) {
  const defaultAppState = getStateDefaults({
    persistedTab,
    dataView,
    services,
  });
  const mergedState = { ...defaultAppState, ...initialUrlState };

  // https://github.com/elastic/kibana/issues/122555
  if (typeof mergedState.hideChart !== 'boolean') {
    mergedState.hideChart = undefined;
  }

  // Don't allow URL state to overwrite the data source if there's an ES|QL query
  if (isOfAggregateQueryType(mergedState.query) && !isEsqlSource(mergedState.dataSource)) {
    mergedState.dataSource = createEsqlDataSource();
  }

  return handleSourceColumnState(mergedState, services.uiSettings);
}
