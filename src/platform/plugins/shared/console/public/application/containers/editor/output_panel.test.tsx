/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Store } from '../../stores/request';
import { OutputPanel } from './output_panel';
import { useRequestReadContext } from '../../contexts';

jest.mock('../../contexts', () => ({
  useRequestReadContext: jest.fn(),
}));

jest.mock('./monaco_editor_output', () => ({
  MonacoEditorOutput: () => <div data-test-subj="mockMonacoEditorOutput" />,
}));

jest.mock('../../components/editor_content_spinner', () => ({
  EditorContentSpinner: () => <div data-test-subj="mockEditorContentSpinner" />,
}));

jest.mock('../../components/output_panel_empty_state', () => ({
  OutputPanelEmptyState: () => <div data-test-subj="mockOutputPanelEmptyState" />,
}));

const mockUseRequestReadContext = useRequestReadContext as jest.MockedFunction<
  typeof useRequestReadContext
>;

const createStoreState = (overrides: Partial<Store> = {}): Store => {
  return {
    requestInFlight: false,
    lastResult: {
      data: null,
    },
    ...overrides,
  };
};

describe('OutputPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders output when request data is present', () => {
    mockUseRequestReadContext.mockReturnValue(
      createStoreState({
        lastResult: {
          data: [
            {
              response: {
                value: '{}',
                statusCode: 200,
                statusText: 'OK',
                timeMs: 1,
                contentType: 'application/json',
              },
              request: { data: '', method: 'GET', path: '/' },
            },
          ],
        },
      })
    );

    render(<OutputPanel loading={false} />);

    expect(screen.getByTestId('mockMonacoEditorOutput')).toBeInTheDocument();
    expect(screen.queryByTestId('mockEditorContentSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockOutputPanelEmptyState')).not.toBeInTheDocument();
  });

  it('renders output when request error is present', () => {
    mockUseRequestReadContext.mockReturnValue(
      createStoreState({
        lastResult: {
          data: null,
          error: {
            response: {
              value: 'Boom',
              statusCode: 500,
              statusText: 'Error',
              timeMs: 1,
              contentType: 'application/json',
            },
            request: { data: '', method: 'GET', path: '/' },
          },
        },
      })
    );

    render(<OutputPanel loading={false} />);

    expect(screen.getByTestId('mockMonacoEditorOutput')).toBeInTheDocument();
  });

  it('renders spinner when loading prop is true and there is no data', () => {
    mockUseRequestReadContext.mockReturnValue(createStoreState());

    render(<OutputPanel loading={true} />);

    expect(screen.getByTestId('mockEditorContentSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('mockMonacoEditorOutput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockOutputPanelEmptyState')).not.toBeInTheDocument();
  });

  it('renders spinner when request is in flight and there is no data', () => {
    mockUseRequestReadContext.mockReturnValue(createStoreState({ requestInFlight: true }));

    render(<OutputPanel loading={false} />);

    expect(screen.getByTestId('mockEditorContentSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('mockMonacoEditorOutput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockOutputPanelEmptyState')).not.toBeInTheDocument();
  });

  it('renders empty state when there is no data and it is not loading', () => {
    mockUseRequestReadContext.mockReturnValue(createStoreState());

    render(<OutputPanel loading={false} />);

    expect(screen.getByTestId('mockOutputPanelEmptyState')).toBeInTheDocument();
    expect(screen.queryByTestId('mockMonacoEditorOutput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockEditorContentSpinner')).not.toBeInTheDocument();
  });

  it('prefers output over spinner when data exists even if loading is true', () => {
    mockUseRequestReadContext.mockReturnValue(
      createStoreState({
        requestInFlight: true,
        lastResult: {
          data: [
            {
              response: {
                value: '{}',
                statusCode: 200,
                statusText: 'OK',
                timeMs: 1,
                contentType: 'application/json',
              },
              request: { data: '', method: 'GET', path: '/' },
            },
          ],
        },
      })
    );

    render(<OutputPanel loading={true} />);

    expect(screen.getByTestId('mockMonacoEditorOutput')).toBeInTheDocument();
    expect(screen.queryByTestId('mockEditorContentSpinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockOutputPanelEmptyState')).not.toBeInTheDocument();
  });
});
