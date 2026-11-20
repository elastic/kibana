/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  preloadWorkflowGraphCanvas,
  WorkflowGraphCanvasWithoutProvider,
} from './lazy_workflow_graph_canvas';
import type { WorkflowGraphCanvasProps } from './workflow_graph_canvas';

const mockCanvasModuleLoaded = jest.fn();

jest.mock('./workflow_graph_canvas', () => {
  mockCanvasModuleLoaded();
  return {
    WorkflowGraphCanvasWithoutProvider: ({ selectedStepId }: { selectedStepId?: string }) => (
      <div data-test-subj="loadedCanvas">{selectedStepId}</div>
    ),
  };
});

const canvasProps = (
  overrides: Partial<WorkflowGraphCanvasProps> = {}
): WorkflowGraphCanvasProps => ({
  workflow: undefined,
  isYamlValid: true,
  onStepSelect: jest.fn(),
  selectedStepId: 'step_1',
  ...overrides,
});

// Once the canvas module has loaded the registry keeps it for the rest of the file, so the
// "not loaded yet" check comes first.
describe('lazy WorkflowGraphCanvasWithoutProvider', () => {
  it('does not fetch the canvas until something renders or preloads it', () => {
    expect(mockCanvasModuleLoaded).not.toHaveBeenCalled();
  });

  it('renders the real canvas with the same props once its chunk has loaded', async () => {
    render(<WorkflowGraphCanvasWithoutProvider {...canvasProps()} />);

    expect(await screen.findByTestId('loadedCanvas')).toHaveTextContent('step_1');
    expect(mockCanvasModuleLoaded).toHaveBeenCalledTimes(1);
  });

  it('shares that one load with every preload', async () => {
    await preloadWorkflowGraphCanvas();
    await preloadWorkflowGraphCanvas();

    expect(mockCanvasModuleLoaded).toHaveBeenCalledTimes(1);
  });
});
