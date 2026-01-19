/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import type { EuiResizeObserverProps } from '@elastic/eui';
import { EuiResizeObserver } from '@elastic/eui';
import { debounce } from 'lodash';

import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { METRIC_TYPE } from '@kbn/analytics';
import { css } from '@emotion/react';
import type { VislibRenderValue } from './vis_type_vislib_vis_fn';
import type { VislibVisController } from './vis_controller';
import { createVislibVisController } from './vis_controller';
import type { VisTypeVislibCoreSetup } from './plugin';

import { getUsageCollectionStart } from './services';
import { GlobalVislibWrapperStyles } from './vis_wrapper.styles';

type VislibWrapperProps = VislibRenderValue & {
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

const visWrapperStyles = {
  base: css({
    display: 'flex',
    flex: '1 1 auto',
    minHeight: 0,
    minWidth: 0,
  }),
  wrapper: css({
    position: 'relative',
  }),
  container: css({
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
};

const VislibWrapper = ({ core, charts, visData, visConfig, handlers }: VislibWrapperProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<VislibVisController | null>(null);
  const skipRenderComplete = useRef<boolean>(true);

  const renderComplete = useCallback(() => {
    if (skipRenderComplete.current) {
      return;
    }
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
    skipRenderComplete.current = true;
  }, [handlers, visConfig]);

  const renderChart = useMemo(
    () =>
      debounce(() => {
        if (visController.current) {
          visController.current.render(visData, visConfig, handlers, renderComplete);
        }
      }, 100),
    [handlers, renderComplete, visConfig, visData]
  );

  const onResize: EuiResizeObserverProps['onResize'] = useCallback(() => {
    renderChart();
  }, [renderChart]);

  useEffect(() => {
    skipRenderComplete.current = false;
    renderChart();
  }, [renderChart]);

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

  useEffect(() => {
    if (handlers.uiState) {
      const uiState = handlers.uiState as PersistedState;

      uiState.on('change', renderChart);

      return () => {
        uiState?.off('change', renderChart);
      };
    }
  }, [handlers.uiState, renderChart]);

  return (
    <>
      <GlobalVislibWrapperStyles />
      <EuiResizeObserver onResize={onResize}>
        {(resizeRef) => (
          <div
            className="vislib__wrapper"
            ref={resizeRef}
            css={[visWrapperStyles.base, visWrapperStyles.wrapper]}
          >
            <div
              className="vislib__container"
              ref={chartDiv}
              css={[visWrapperStyles.base, visWrapperStyles.container]}
            />
          </div>
        )}
      </EuiResizeObserver>
    </>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VislibWrapper as default };
