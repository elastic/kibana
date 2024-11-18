/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { EuiResizeObserver, EuiResizeObserverProps, useEuiTheme } from '@elastic/eui';

import type { IInterpreterRenderHandlers, RenderMode } from '@kbn/expressions-plugin/common';
import { createVegaVisualization } from '../vega_visualization';
import { VegaVisualizationDependencies } from '../plugin';
import { VegaParser } from '../data_model/vega_parser';

import { GlobalVegaVisStyles, wrapperStyles } from './vega_vis.styles';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: () => void;
  renderMode: RenderMode;
  visData: VegaParser;
}

type VegaVisController = InstanceType<ReturnType<typeof createVegaVisualization>>;

export const VegaVisComponent = ({
  visData,
  fireEvent,
  renderComplete,
  deps,
  renderMode,
}: VegaVisComponentProps) => {
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

  const euiTheme = useEuiTheme();

  return (
    <>
      <GlobalVegaVisStyles />
      <EuiResizeObserver onResize={onContainerResize}>
        {(resizeRef) => (
          <div className="vgaVis__wrapper" css={wrapperStyles(euiTheme)} ref={resizeRef}>
            <div ref={chartDiv} />
          </div>
        )}
      </EuiResizeObserver>
    </>
  );
};
