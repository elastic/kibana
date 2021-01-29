/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { throttle } from 'lodash';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { PersistedState } from 'src/plugins/visualizations/public';
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
  const uiState = handlers.uiState as PersistedState;

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
