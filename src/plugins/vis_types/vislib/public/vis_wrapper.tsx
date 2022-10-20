/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiResizeObserver, EuiResizeObserverProps } from '@elastic/eui';
import { debounce } from 'lodash';

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';

import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { METRIC_TYPE } from '@kbn/analytics';
import { VislibRenderValue } from './vis_type_vislib_vis_fn';
import { createVislibVisController, VislibVisController } from './vis_controller';
import { VisTypeVislibCoreSetup } from './plugin';
import { PieRenderValue } from './pie_fn';

import './index.scss';
import { getUsageCollectionStart } from './services';

type VislibWrapperProps = (VislibRenderValue | PieRenderValue) & {
  core: VisTypeVislibCoreSetup;
  charts: ChartsPluginSetup;
  handlers: IInterpreterRenderHandlers;
};

/** @internal **/
const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

const VislibWrapper = ({ core, charts, visData, visConfig, handlers }: VislibWrapperProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<VislibVisController | null>(null);

  const renderComplete = useMemo(
    () => () => {
      const usageCollection = getUsageCollectionStart();
      const containerType = extractContainerType(handlers.getExecutionContext());

      if (usageCollection && containerType) {
        usageCollection.reportUiCounter(
          containerType,
          METRIC_TYPE.COUNT,
          `render_agg_based_${visConfig!.type}`
        );
      }
      handlers.done();
    },
    [handlers, visConfig]
  );

  const updateChart = useMemo(
    () =>
      (skipRenderComplete = false) => {
        if (visController.current) {
          visController.current.render(
            visData,
            visConfig,
            handlers,
            skipRenderComplete ? undefined : renderComplete
          );
        }
      },
    [handlers, renderComplete, visConfig, visData]
  );

  const onResize: EuiResizeObserverProps['onResize'] = useMemo(
    () =>
      debounce(() => {
        updateChart(true);
      }, 100),
    [updateChart]
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
    <EuiResizeObserver onResize={onResize}>
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
