/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import '@kbn/code-editor-mock/jest_helper';
import React from 'react';
import { ApmStacktrace } from './apm_stacktrace';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { useEsDocSearch } from '../../../../hooks/use_es_doc_search';

jest.mock('../../../../hooks/use_es_doc_search', () => ({
  useEsDocSearch: jest.fn(),
}));

const mockUseEsDocSearch = jest.mocked(useEsDocSearch);

const defaultHit = {
  flattened: {},
  id: '',
  raw: { _id: '1', _index: 'index1' },
};

const getMockHit = (error: Record<string, unknown>) => {
  return buildDataTableRecord({
    _index: '.ds-logs-apm.error-default-2024.12.31-000001',
    _id: 'id123',
    _score: 1,
    _source: {
      data_stream: {
        type: 'logs',
        dataset: 'apm.error',
        namespace: 'default',
      },
      '@timestamp': '2024-12-31T00:00:00.000Z',
      message: 'Log stacktrace',
      error,
    },
  });
};

const renderApmStacktrace = () =>
  renderWithKibanaRenderContext(<ApmStacktrace hit={defaultHit} dataView={dataViewMock} />);

describe('APM Stacktrace component', () => {
  beforeEach(() => {
    mockUseEsDocSearch.mockReset();
  });

  it('renders loading state', () => {
    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Loading, null, () => {}]);

    renderApmStacktrace();

    expect(screen.getByRole('progressbar')).toBeVisible();
  });

  it('renders error state', () => {
    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Error, null, () => {}]);

    renderApmStacktrace();

    expect(screen.getByText('Failed to load stacktrace')).toBeVisible();
  });

  it('renders log stacktrace', async () => {
    const mockHit = getMockHit({
      id: '1',
      grouping_key: '1',
      log: {
        message: 'Log message',
        stacktrace: [
          {
            exclude_from_grouping: false,
            abs_path: 'test.js',
            filename: 'test.js',
            line: {
              number: 1,
              context: 'console.log(err)',
            },
            function: '<anonymous>',
            context: {
              pre: ['console.log(err)'],
              post: ['console.log(err)'],
            },
            vars: {},
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            abs_path: 'test.js',
            filename: 'test.js',
            line: {
              number: 1,
            },
            function: 'test',
            vars: {},
          },
        ],
      },
    });

    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Found, mockHit, () => {}]);

    renderApmStacktrace();

    expect(await screen.findByText('<anonymous>')).toBeVisible();
    expect(screen.getAllByText('test.js')[0]).toBeVisible();
    expect(screen.getByText('1 library frame')).toBeVisible();
  });

  it('renders exception stacktrace', async () => {
    const mockHit = getMockHit({
      id: '1',
      grouping_key: '1',
      exception: [
        {
          message: 'Exception stacktrace',
          stacktrace: [
            {
              exclude_from_grouping: false,
              abs_path: 'test.js',
              filename: 'test.js',
              line: {
                number: 1,
                context: 'console.log(err)',
              },
              function: '<anonymous>',
              context: {
                pre: ['console.log(err)'],
                post: ['console.log(err);'],
              },
              vars: {},
            },
            {
              exclude_from_grouping: false,
              library_frame: true,
              abs_path: 'test.js',
              filename: 'test.js',
              line: {
                number: 1,
              },
              function: 'test',
              vars: {},
            },
          ],
        },
        {
          handled: true,
          module: 'module',
          attributes: {
            test: 'test',
          },
          message: 'message',
          type: 'type',
        },
      ],
    });

    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Found, mockHit, () => {}]);

    renderApmStacktrace();

    expect(await screen.findByText('Exception stacktrace')).toBeVisible();
    expect(screen.getByText('<anonymous>')).toBeVisible();
    expect(screen.getByText('1 library frame')).toBeVisible();
  });

  it('renders plain text stacktrace', async () => {
    const mockHit = getMockHit({
      id: '1',
      grouping_key: '1',
      exception: [
        {
          handled: true,
          message: 'message',
          type: 'type',
        },
      ],
      stack_trace: 'test',
    });

    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Found, mockHit, () => {}]);

    renderApmStacktrace();

    expect(await screen.findByText('message')).toBeVisible();
    expect(screen.getByText('test')).toBeVisible();
  });
});
