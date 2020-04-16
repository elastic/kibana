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
import useMountedState from 'react-use/lib/useMountedState';
import { CollectConfigProps } from './types';
import { DiscoverDrilldownConfig, IndexPatternItem } from '../components/discover_drilldown_config';
import { Params } from './drilldown';

export interface CollectConfigContainerProps extends CollectConfigProps {
  params: Params;
}

export const CollectConfigContainer: React.FC<CollectConfigContainerProps> = ({
  config,
  onConfig,
  params: { start },
}) => {
  const isMounted = useMountedState();
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternItem[]>([]);

  useEffect(() => {
    (async () => {
      const indexPatternSavedObjects = await start().plugins.data.indexPatterns.getCache();
      if (!isMounted()) return;
      setIndexPatterns(
        indexPatternSavedObjects
          ? indexPatternSavedObjects.map(indexPattern => ({
              id: indexPattern.id,
              title: indexPattern.attributes.title,
            }))
          : []
      );
    })();
  }, [isMounted, start]);

  return (
    <DiscoverDrilldownConfig
      activeIndexPatternId={config.indexPatternId}
      indexPatterns={indexPatterns}
      onIndexPatternSelect={indexPatternId => {
        onConfig({ ...config, indexPatternId });
      }}
      customIndexPattern={config.customIndexPattern}
      onCustomIndexPatternToggle={() =>
        onConfig({
          ...config,
          customIndexPattern: !config.customIndexPattern,
          indexPatternId: undefined,
        })
      }
      carryFiltersAndQuery={config.carryFiltersAndQuery}
      onCarryFiltersAndQueryToggle={() =>
        onConfig({
          ...config,
          carryFiltersAndQuery: !config.carryFiltersAndQuery,
        })
      }
      carryTimeRange={config.carryTimeRange}
      onCarryTimeRangeToggle={() =>
        onConfig({
          ...config,
          carryTimeRange: !config.carryTimeRange,
        })
      }
    />
  );
};
