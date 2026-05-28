/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import React from 'react';
import { WorkflowGraphCanvasToolbar } from './workflow_graph_canvas_toolbar';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      zoomIn: jest.fn(),
      zoomOut: jest.fn(),
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewport: jest.fn(),
    }),
    useStore: (selector: (state: { transform: [number, number, number] }) => unknown) =>
      selector({ transform: [0, 0, 1] }),
  };
});

describe('WorkflowGraphCanvasToolbar', () => {
  it('renders zoom and layout controls', () => {
    const onDirectionChange = jest.fn();
    const { getByTestId } = render(
      <ReactFlowProvider>
        <WorkflowGraphCanvasToolbar direction="TB" onDirectionChange={onDirectionChange} />
      </ReactFlowProvider>
    );

    expect(getByTestId('workflowGraphCanvasToolbar')).toBeInTheDocument();
    expect(getByTestId('workflowGraphZoomIn')).toBeInTheDocument();
    expect(getByTestId('workflowGraphZoomOut')).toBeInTheDocument();
    expect(getByTestId('workflowGraphLayoutDirection')).toBeInTheDocument();
    expect(getByTestId('workflowGraphLayoutVertical')).toBeInTheDocument();
    expect(getByTestId('workflowGraphLayoutHorizontal')).toBeInTheDocument();
  });
});
