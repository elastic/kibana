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
import { WorkflowGraphCanvasWithoutProvider } from './lazy_workflow_graph_canvas';
import type { WorkflowGraphCanvasProps } from './workflow_graph_canvas';

jest.mock('./workflow_graph_canvas', () => {
  throw new Error('Loading chunk failed');
});

describe('lazy WorkflowGraphCanvasWithoutProvider when its chunk cannot load', () => {
  it('shows the graph error callout with the cause instead of crashing the page', async () => {
    // React logs the error the boundary catches; it is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const props: WorkflowGraphCanvasProps = {
      workflow: undefined,
      isYamlValid: true,
      onStepSelect: jest.fn(),
    };

    render(<WorkflowGraphCanvasWithoutProvider {...props} />);

    expect(await screen.findByText('Workflow graph could not be displayed')).toBeInTheDocument();
    expect(screen.getByText('Loading chunk failed')).toBeInTheDocument();
  });
});
