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

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { throttle } from 'lodash';

import { IInterpreterRenderHandlers, Datatable } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';
import { RegionMapVisualizationDependencies } from './plugin';
import { RegionMapVisConfig } from './region_map_types';
// @ts-expect-error
import { createRegionMapVisualization } from './region_map_visualization';

import './region_map_visualization.scss';

interface RegionMapVisController {
  render(visData?: Datatable, visConfig?: RegionMapVisConfig): Promise<void>;
  resize(): void;
  destroy(): void;
}

interface TileMapVisualizationProps {
  deps: RegionMapVisualizationDependencies;
  handlers: IInterpreterRenderHandlers;
  visData: Datatable;
  visConfig: RegionMapVisConfig;
}

const RegionMapVisualization = ({
  deps,
  handlers,
  visData,
  visConfig,
}: TileMapVisualizationProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<RegionMapVisController | null>(null);
  const isFirstRender = useRef(true);
  const uiState = handlers.uiState as PersistedState;

  useEffect(() => {
    if (chartDiv.current && isFirstRender.current) {
      isFirstRender.current = false;
      const Controller = createRegionMapVisualization(deps);
      visController.current = new Controller(chartDiv.current, handlers, visConfig);
    }
  }, [deps, handlers, visConfig, visData]);

  useEffect(() => {
    visController.current?.render(visData, visConfig).then(handlers.done);
  }, [visData, visConfig, handlers.done]);

  useEffect(() => {
    const onUiStateChange = () => {
      visController.current?.render().then(handlers.done);
    };

    uiState.on('change', onUiStateChange);

    return () => {
      uiState.off('change', onUiStateChange);
    };
  }, [uiState, handlers.done]);

  useEffect(() => {
    return () => {
      visController.current?.destroy();
      visController.current = null;
    };
  }, []);

  const updateChartSize = useMemo(() => throttle(() => visController.current?.resize(), 300), []);

  return (
    <EuiResizeObserver onResize={updateChartSize}>
      {(resizeRef) => (
        <div className="rgmChart__wrapper" ref={resizeRef}>
          <div className="rgmChart" ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RegionMapVisualization as default };
