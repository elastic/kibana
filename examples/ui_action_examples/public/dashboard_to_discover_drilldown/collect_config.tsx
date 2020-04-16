/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from 'react';
import { CollectConfigProps } from './types';
import { DiscoverDrilldownConfig } from '../components/discover_drilldown_config';
import { Params } from './drilldown';

export interface CollectConfigContainerProps extends CollectConfigProps {
  params: Params;
}

export const CollectConfigContainer: React.FC<CollectConfigContainerProps> = ({
  config,
  onConfig,
  params: { start },
}) => {
  const [dashboards] = useState([
    { id: 'dashboard1', title: 'Dashboard 1' },
    { id: 'dashboard2', title: 'Dashboard 2' },
    { id: 'dashboard3', title: 'Dashboard 3' },
    { id: 'dashboard4', title: 'Dashboard 4' },
  ]);

  useEffect(() => {
    // TODO: Load dashboards...
  }, [start]);

  return (
    <DiscoverDrilldownConfig
      activeDashboardId={config.indexPatternId}
      dashboards={dashboards}
      currentFilters={config.useCurrentFilters}
      keepRange={config.useCurrentDateRange}
      onDashboardSelect={indexPatternId => {
        onConfig({ ...config, indexPatternId });
      }}
      onCurrentFiltersToggle={() =>
        onConfig({
          ...config,
          useCurrentFilters: !config.useCurrentFilters,
        })
      }
      onKeepRangeToggle={() =>
        onConfig({
          ...config,
          useCurrentDateRange: !config.useCurrentDateRange,
        })
      }
    />
  );
};
