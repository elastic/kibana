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
import { WorkflowEditorLayout } from './workflow_detail_layout';

/* eslint-disable @typescript-eslint/no-var-requires */
// Mock react-reverse-portal to simplify rendering
jest.mock('react-reverse-portal', () => {
  const R = require('react');
  return {
    createHtmlPortalNode: jest.fn(() => ({ element: globalThis.document.createElement('div') })),
    InPortal: (p: Record<string, unknown>) => R.createElement(R.Fragment, null, p.children),
    OutPortal: () => R.createElement('div', { 'data-test-subj': 'out-portal' }),
  };
});

// Mock ResizableLayout
jest.mock('@kbn/resizable-layout', () => {
  const R = require('react');
  return {
    ResizableLayout: (p: Record<string, unknown>) =>
      R.createElement(
        'div',
        { 'data-test-subj': 'WorkflowEditorWithSidebarLayout' },
        p.flexPanel,
        p.fixedPanel
      ),
    ResizableLayoutDirection: { Horizontal: 'horizontal' },
    ResizableLayoutMode: { Resizable: 'resizable' },
    ResizableLayoutOrder: { End: 'end' },
  };
});

// Mock useLocalStorage
jest.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(() => [500, jest.fn()]),
}));

describe('WorkflowEditorLayout', () => {
  it('should render the editor when no sidebar is provided', () => {
    render(
      <WorkflowEditorLayout
        editor={<div data-test-subj="editor">{'Editor'}</div>}
        executionList={null}
        executionDetail={null}
      />
    );

    expect(screen.getByText('Editor')).toBeInTheDocument();
  });

  it('should render editor with sidebar when executionList is provided', () => {
    render(
      <WorkflowEditorLayout
        editor={<div data-test-subj="editor">{'Editor'}</div>}
        executionList={<div data-test-subj="execution-list">{'Execution List'}</div>}
        executionDetail={null}
      />
    );

    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Execution List')).toBeInTheDocument();
  });

  it('should render editor with sidebar when executionDetail is provided', () => {
    render(
      <WorkflowEditorLayout
        editor={<div data-test-subj="editor">{'Editor'}</div>}
        executionList={null}
        executionDetail={<div data-test-subj="execution-detail">{'Execution Detail'}</div>}
      />
    );

    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Execution Detail')).toBeInTheDocument();
  });

  it('should prefer executionList over executionDetail when both are provided', () => {
    render(
      <WorkflowEditorLayout
        editor={<div data-test-subj="editor">{'Editor'}</div>}
        executionList={<div data-test-subj="execution-list">{'Execution List'}</div>}
        executionDetail={<div data-test-subj="execution-detail">{'Execution Detail'}</div>}
      />
    );

    expect(screen.getByText('Execution List')).toBeInTheDocument();
    expect(screen.queryByText('Execution Detail')).not.toBeInTheDocument();
  });
});
