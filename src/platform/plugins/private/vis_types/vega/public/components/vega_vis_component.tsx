/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  EuiResizeObserver,
  type EuiResizeObserverProps,
  euiScrollBarStyles,
  type UseEuiTheme,
} from '@elastic/eui';

import type { IInterpreterRenderHandlers, RenderMode } from '@kbn/expressions-plugin/common';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { createVegaVisualization } from '../vega_visualization';
import type { VegaVisualizationDependencies } from '../plugin';
import type { VegaParser } from '../data_model/vega_parser';

import { GlobalVegaVisStyles } from './vega_vis.styles';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: () => void;
  renderMode: RenderMode;
  visData: VegaParser;
}

type VegaVisController = InstanceType<ReturnType<typeof createVegaVisualization>>;

const vegaVisStyles = {
  wrapperStyles: (euiTheme: UseEuiTheme) => css`
    ${euiScrollBarStyles(euiTheme)}
    display: flex;
    flex: 1 1 0;
    overflow: auto;
  `,
};

export const VegaVisComponent = ({
  visData,
  fireEvent,
  renderComplete,
  deps,
  renderMode,
}: VegaVisComponentProps) => {
  const styles = useMemoCss(vegaVisStyles);
  const chartDiv = useRef<HTMLDivElement>(null);
  const renderCompleted = useRef(false);
  const visController = useRef<VegaVisController | null>(null);

  useEffect(() => {
    if (chartDiv.current) {
      const VegaVis = createVegaVisualization(deps, renderMode);
      visController.current = new VegaVis(chartDiv.current, fireEvent);
    }
    return () => {
      visController.current?.destroy();
      visController.current = null;
    };
  }, [deps, fireEvent, renderMode]);

  useEffect(() => {
    const asyncRender = async (visCtrl: VegaVisController) => {
      await visCtrl.render(visData);
      renderCompleted.current = true;
      renderComplete();
    };

    if (visController.current) {
      asyncRender(visController.current);
    }
  }, [renderComplete, visData]);

  const onContainerResize: EuiResizeObserverProps['onResize'] = useCallback((dimensions) => {
    if (renderCompleted.current) {
      visController.current?.resize(dimensions);
    }
  }, []);

  return (
    <>
      <GlobalVegaVisStyles />
      <EuiResizeObserver onResize={onContainerResize}>
        {(resizeRef) => (
          <div css={styles.wrapperStyles} ref={resizeRef}>
            <div ref={chartDiv} />
          </div>
        )}
      </EuiResizeObserver>
    </>
  );
};
