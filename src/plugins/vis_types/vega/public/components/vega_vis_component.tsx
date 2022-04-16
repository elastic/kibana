/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { EuiResizeObserver, EuiResizeObserverProps } from '@elastic/eui';
import { throttle } from 'lodash';

import type { IInterpreterRenderHandlers, RenderMode } from '@kbn/expressions-plugin';
import { createVegaVisualization } from '../vega_visualization';
import { VegaVisualizationDependencies } from '../plugin';
import { VegaParser } from '../data_model/vega_parser';

import './vega_vis.scss';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: () => void;
  renderMode: RenderMode;
  visData: VegaParser;
}

type VegaVisController = InstanceType<ReturnType<typeof createVegaVisualization>>;

const THROTTLE_INTERVAL = 300;

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

  const resizeChart = useMemo(
    () =>
      throttle(
        (dimensions) => {
          visController.current?.resize(dimensions);
        },
        THROTTLE_INTERVAL,
        { leading: false, trailing: true }
      ),
    []
  );

  const onContainerResize: EuiResizeObserverProps['onResize'] = useCallback(
    (dimensions) => {
      if (renderCompleted.current) {
        resizeChart(dimensions);
      }
    },
    [resizeChart]
  );

  return (
    <EuiResizeObserver onResize={onContainerResize}>
      {(resizeRef) => (
        <div className="vgaVis__wrapper" ref={resizeRef}>
          <div ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};
