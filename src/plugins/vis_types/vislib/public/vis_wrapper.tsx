/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiResizeObserver } from '@elastic/eui';
import { debounce } from 'lodash';

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';

import { VislibRenderValue } from './vis_type_vislib_vis_fn';
import { createVislibVisController, VislibVisController } from './vis_controller';
import { VisTypeVislibCoreSetup } from './plugin';
import { PieRenderValue } from './pie_fn';

import './index.scss';

type VislibWrapperProps = (VislibRenderValue | PieRenderValue) & {
  core: VisTypeVislibCoreSetup;
  charts: ChartsPluginSetup;
  handlers: IInterpreterRenderHandlers;
};

const VislibWrapper = ({ core, charts, visData, visConfig, handlers }: VislibWrapperProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<VislibVisController | null>(null);

  const updateChart = useMemo(
    () =>
      debounce(() => {
        if (visController.current) {
          visController.current.render(visData, visConfig, handlers);
        }
      }, 100),
    [visConfig, visData, handlers]
  );

  useEffect(() => {
    if (chartDiv.current) {
      const Controller = createVislibVisController(core, charts);
      visController.current = new Controller(chartDiv.current);
    }
    return () => {
      visController.current?.destroy();
      visController.current = null;
    };
  }, [core, charts]);

  useEffect(updateChart, [updateChart]);

  useEffect(() => {
    if (handlers.uiState) {
      const uiState = handlers.uiState as PersistedState;

      uiState.on('change', updateChart);

      return () => {
        uiState?.off('change', updateChart);
      };
    }
  }, [handlers.uiState, updateChart]);

  return (
    <EuiResizeObserver onResize={updateChart}>
      {(resizeRef) => (
        <div className="vislib__wrapper" ref={resizeRef}>
          <div className="vislib__container" ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VislibWrapper as default };
