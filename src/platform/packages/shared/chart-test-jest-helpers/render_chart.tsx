/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DebugState } from '@elastic/charts';
import { act, waitFor, type RenderResult } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import React from 'react';

declare global {
  interface Window {
    _echDebugStateFlag?: boolean;
  }
}

interface ChartPropsWithRenderComplete {
  renderComplete: () => void;
}

/**
 * Renders a chart component and waits for it to complete rendering.
 *
 * @param props - Chart props including a `renderComplete` callback (usually a Jest mock).
 * @param Component - The chart React component to render.
 * @param withDebug - If true, enables the Elastic Charts debug flag and returns the chart's debug state.
 * @returns An object containing the RTL render result and, if requested, the parsed chart debug state.
 *
 * Usage:
 *   await renderChart(props, MyChartComponent); // returns { component }
 *   await renderChart(props, MyChartComponent, true); // returns { component, debugState }
 */
export async function renderChart<P extends ChartPropsWithRenderComplete>(
  props: P,
  Component: React.FC<P>,
  withDebug = false
): Promise<{ component: RenderResult; debugState?: DebugState }> {
  // enable the ech debug flag
  if (withDebug) window._echDebugStateFlag = true;
  // render the chart
  const component = renderWithI18n(<Component {...props} />);
  // wait for the first request animation frame to tick (used by ech to detect the parent size from the mocked ResizeObserver)
  await waitForRenderComplete(props.renderComplete);
  // if with debug enabled, then extract that
  if (withDebug) {
    // extract the debug state json
    const debugStateJSON = component?.container
      ?.querySelector('.echChartStatus')
      ?.getAttribute('data-ech-debug-state');

    expect(debugStateJSON).toBeTruthy();
    return { component, debugState: JSON.parse(debugStateJSON as string) };
  }
  return { component };
}

/**
 * Waits for the chart to complete its initial rendering in tests.
 *
 * Advances the Jest timer to trigger a requestAnimationFrame (used by Elastic Charts to detect parent size)
 * and waits for the provided `renderComplete` callback to be called.
 *
 * @param renderComplete - Callback function that signals chart rendering is complete (usually a Jest mock).
 */
export async function waitForRenderComplete(renderComplete: () => void) {
  // wait for the first request animation frame to tick (used by ech to detect the parent size from the mocked ResizeObserver)
  await act(async () => {
    jest.advanceTimersByTime(30);
  });
  // wait for render complete
  await waitFor(() => expect(renderComplete).toHaveBeenCalled());
}
