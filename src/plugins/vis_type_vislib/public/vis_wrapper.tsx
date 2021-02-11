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

import { IInterpreterRenderHandlers } from '../../expressions/public';
import { ChartsPluginSetup } from '../../charts/public';

import { VislibRenderValue } from './vis_type_vislib_vis_fn';
import { createVislibVisController, VislibVisController } from './vis_controller';
import { VisTypeVislibCoreSetup } from './plugin';

import './index.scss';

type VislibWrapperProps = VislibRenderValue & {
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
      handlers.uiState.on('change', updateChart);

      return () => {
        handlers.uiState?.off('change', updateChart);
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
