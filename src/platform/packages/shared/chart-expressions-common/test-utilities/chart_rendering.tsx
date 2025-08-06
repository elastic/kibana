/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { DebugState } from '@elastic/charts';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';

declare global {
  interface Window {
    _echDebugStateFlag?: boolean;
  }
}

export async function expectChartsToRender<P>(
  props: P & { renderComplete: () => void },
  Component: React.FC<P>
): Promise<DebugState> {
  // enable the ech debug flag
  window._echDebugStateFlag = true;
  // render the chart
  const component = render(<Component {...props} />);
  // wait for the first request animation frame to tick (used by ECh to detect the parent size from the mocked ResizeObserver)
  await act(async () => {
    jest.advanceTimersByTime(30);
  });
  // wait for render complete
  await waitFor(() => expect(props.renderComplete).toHaveBeenCalled());

  // extract the debug state json
  const debugStateJSON = component?.container
    ?.querySelector('.echChartStatus')
    ?.getAttribute('data-ech-debug-state');

  expect(debugStateJSON).toBeTruthy();

  return JSON.parse(debugStateJSON as string);
}
