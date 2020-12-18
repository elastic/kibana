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

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { TileMapVisualizationDependencies } from './plugin';
import { TileMapVisConfig, TileMapVisData } from './types';
// @ts-expect-error
import { createTileMapVisualization } from './tile_map_visualization';

import './tile_map_visualization.scss';

interface TileMapVisController {
  render(visData?: TileMapVisData, visConfig?: TileMapVisConfig): Promise<void>;
  resize(): void;
  destroy(): void;
}

interface TileMapVisualizationProps {
  deps: TileMapVisualizationDependencies;
  handlers: IInterpreterRenderHandlers;
  visData: TileMapVisData;
  visConfig: TileMapVisConfig;
}

const TileMapVisualization = ({
  deps,
  handlers,
  visData,
  visConfig,
}: TileMapVisualizationProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<TileMapVisController | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (chartDiv.current && isFirstRender.current) {
      isFirstRender.current = false;
      const Controller = createTileMapVisualization(deps);
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

    handlers.uiState?.on('change', onUiStateChange);

    return () => {
      handlers.uiState?.off('change', onUiStateChange);
    };
  }, [handlers]);

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
        <div className="tlmChart__wrapper" ref={resizeRef}>
          <div className="tlmChart" ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TileMapVisualization as default };
