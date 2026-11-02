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

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { createVegaVisualization } from '../vega_visualization';
import type { VegaVisualizationDependencies } from '../plugin';
import type { VegaMapPosition, VegaRenderDescriptor } from '../data_model/types';
import type { VegaInspectorAdapters } from '../vega_inspector';
import type { VegaEventHandler } from '../types';

import { GlobalVegaVisStyles } from './vega_vis.styles';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: VegaEventHandler;
  /** Receives the view's errors and inspectable data; owned by the parent, never by the view. */
  inspectorAdapters?: VegaInspectorAdapters;
  renderComplete: () => void;
  /** Whether runtime Vega warnings are surfaced in the panel. Enabled while authoring a spec. */
  showWarnings: boolean;
  visData: VegaRenderDescriptor;
  /** Map position to render `visData` with. Only read when `visData` changes. */
  mapView?: VegaMapPosition;
  /** Called when the user finishes moving the map. Read on every call, so it can change freely. */
  onMapViewChange?: (mapView: VegaMapPosition) => void;
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
  mapView,
  onMapViewChange,
  fireEvent,
  inspectorAdapters,
  renderComplete,
  deps,
  showWarnings,
}: VegaVisComponentProps) => {
  const styles = useMemoCss(vegaVisStyles);
  const chartDiv = useRef<HTMLDivElement>(null);
  const renderCompleted = useRef(false);
  const visController = useRef<VegaVisController | null>(null);
  const mapViewRef = useRef(mapView);
  mapViewRef.current = mapView;
  const onMapViewChangeRef = useRef(onMapViewChange);
  onMapViewChangeRef.current = onMapViewChange;

  useEffect(() => {
    if (chartDiv.current) {
      const VegaVis = createVegaVisualization(deps, showWarnings);
      visController.current = new VegaVis(chartDiv.current, fireEvent, (view) =>
        onMapViewChangeRef.current?.(view)
      );
    }
    return () => {
      visController.current?.destroy();
      visController.current = null;
    };
  }, [deps, fireEvent, showWarnings]);

  useEffect(() => {
    const asyncRender = async (visCtrl: VegaVisController) => {
      await visCtrl.render(visData, inspectorAdapters, mapViewRef.current);
      renderCompleted.current = true;
      renderComplete();
    };

    if (visController.current) {
      asyncRender(visController.current);
    }
  }, [inspectorAdapters, renderComplete, visData]);

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
