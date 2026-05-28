/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkflowGraphCanvasFloatingBar } from './workflow_graph_canvas_floating_bar';

const mockZoomIn = jest.fn();
const mockZoomOut = jest.fn();
const mockGetViewport = jest.fn(() => ({ x: 1, y: 2, zoom: 0.75 }));
const mockSetViewport = jest.fn();

jest.mock('@xyflow/react', () => {
  const original = jest.requireActual('@xyflow/react');
  return {
    ...original,
    useReactFlow: () => ({
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      getViewport: mockGetViewport,
      setViewport: mockSetViewport,
    }),
    useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
      selector({ transform: [0, 0, 1.1] }),
  };
});

describe('WorkflowGraphCanvasFloatingBar', () => {
  it('calls onDirectionChange for vertical/horizontal layout', async () => {
    const onDirectionChange = jest.fn();
    const user = userEvent.setup();

    render(<WorkflowGraphCanvasFloatingBar direction="TB" onDirectionChange={onDirectionChange} />);

    await user.click(screen.getByTestId('workflowGraphLayoutHorizontal'));
    expect(onDirectionChange).toHaveBeenCalledWith('LR');

    await user.click(screen.getByTestId('workflowGraphLayoutVertical'));
    expect(onDirectionChange).toHaveBeenCalledWith('TB');
  });
});
