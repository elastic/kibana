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
  }, [core, charts, handlers]);

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
