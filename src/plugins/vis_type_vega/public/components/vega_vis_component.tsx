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
import { createVegaVisualization } from '../vega_visualization';
import { VegaVisualizationDependencies } from '../plugin';
import { VegaParser } from '../data_model/vega_parser';

import './vega_vis.scss';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: () => void;
  visData: VegaParser;
}

type VegaVisController = InstanceType<ReturnType<typeof createVegaVisualization>>;

const VegaVisComponent = ({ visData, fireEvent, renderComplete, deps }: VegaVisComponentProps) => {
  const chartDiv = useRef<HTMLDivElement>(null);
  const visController = useRef<VegaVisController | null>(null);

  useEffect(() => {
    if (chartDiv.current) {
      const VegaVis = createVegaVisualization(deps);
      visController.current = new VegaVis(chartDiv.current, fireEvent);
    }

    return () => {
      visController.current?.destroy();
      visController.current = null;
    };
  }, [deps, fireEvent]);

  useEffect(() => {
    if (visController.current) {
      visController.current.render(visData).then(renderComplete);
    }
  }, [visData, renderComplete]);

  const updateChartSize = useMemo(
    () =>
      throttle(() => {
        if (visController.current) {
          visController.current.render(visData).then(renderComplete);
        }
      }, 300),
    [renderComplete, visData]
  );

  return (
    <EuiResizeObserver onResize={updateChartSize}>
      {(resizeRef) => (
        <div className="vgaVis__wrapper" ref={resizeRef}>
          <div ref={chartDiv} />
        </div>
      )}
    </EuiResizeObserver>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaVisComponent as default };
