/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import '@kbn/code-editor-mock/jest_helper';
import * as hooks from '../../../../hooks/use_es_doc_search';
import { EuiLoadingSpinner } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { ApmStacktrace } from './apm_stacktrace';
import { EuiThemeProvider } from '@elastic/eui';
import { ExceptionStacktrace, PlaintextStacktrace, Stacktrace } from '@kbn/event-stacktrace';

const mockDataView = {
  getComputedFields: () => [],
} as never;

describe('APM Stacktrace component', () => {
  test('renders loading state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [0, null, () => {}]);

    const comp = mountWithIntl(
      <ApmStacktrace
        hit={{
          raw: { _id: '1', _index: 'index1' },
          flattened: {},
          id: '',
        }}
        dataView={mockDataView}
      />
    );

    const loadingSpinner = comp.find(EuiLoadingSpinner);
    expect(loadingSpinner).toHaveLength(1);
  });

  test('renders error state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [3, null, () => {}]);

    const comp = mountWithIntl(
      <ApmStacktrace
        hit={{
          raw: { _id: '1', _index: 'index1' },
          flattened: {},
          id: '',
        }}
        dataView={mockDataView}
      />
    );
    const errorComponent = comp.find('[data-test-subj="unifiedDocViewerApmStacktraceErrorMsg"]');
    expect(errorComponent).toHaveLength(1);
  });

  test('renders log stacktrace', () => {
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

    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, () => {}]);

    const comp = mountWithIntl(
      <EuiThemeProvider>
        <ApmStacktrace
          hit={{
            raw: { _id: '1', _index: 'index1' },
            flattened: {},
            id: '',
          }}
          dataView={mockDataView}
        />
      </EuiThemeProvider>
    );

    const stacktraceComponent = comp.find(Stacktrace);
    expect(stacktraceComponent).toHaveLength(1);
  });

  test('renders exception stacktrace', () => {
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

    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, () => {}]);

    const comp = mountWithIntl(
      <EuiThemeProvider>
        <ApmStacktrace
          hit={{
            raw: { _id: '1', _index: 'index1' },
            flattened: {},
            id: '',
          }}
          dataView={mockDataView}
        />
      </EuiThemeProvider>
    );

    const stacktraceComponent = comp.find(ExceptionStacktrace);
    expect(stacktraceComponent).toHaveLength(1);
  });

  test('renders plain text stacktrace', () => {
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

    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, () => {}]);

    const comp = mountWithIntl(
      <EuiThemeProvider>
        <ApmStacktrace
          hit={{
            raw: { _id: '1', _index: 'index1' },
            flattened: {},
            id: '',
          }}
          dataView={mockDataView}
        />
      </EuiThemeProvider>
    );

    const stacktraceComponent = comp.find(PlaintextStacktrace);
    expect(stacktraceComponent).toHaveLength(1);
  });
});

function getMockHit(error: Record<string, unknown>) {
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
}
