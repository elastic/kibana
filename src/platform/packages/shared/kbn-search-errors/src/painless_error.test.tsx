/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { createEsError } from './create_es_error';
import { screen } from '@testing-library/react';
import { renderSearchError } from './render_search_error';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

const servicesMock = {
  application: coreMock.createStart().application,
  docLinks: {
    links: {
      fleet: {
        datastreamsTSDSMetrics: '',
      },
    },
  } as CoreStart['docLinks'],
};

const dataViewMock = {
  id: '1234',
  title: 'logs',
} as AbstractDataView;

describe('Painless error', () => {
  const painlessError = createEsError(
    {
      statusCode: 400,
      message: 'search_phase_execution_exception',
      attributes: {
        error: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          failed_shards: [
            {
              shard: 0,
              index: '.kibana_11',
              node: 'b3HX8C96Q7q1zgfVLxEsPA',
              reason: {
                type: 'script_exception',
                reason: 'compile error',
                script_stack: ['invalid', '^---- HERE'],
                script: 'invalid',
                lang: 'painless',
                position: {
                  offset: 0,
                  start: 0,
                  end: 7,
                },
                caused_by: {
                  type: 'illegal_argument_exception',
                  reason: 'cannot resolve symbol [invalid]',
                },
              },
            },
          ],
        },
      },
    },
    () => {},
    servicesMock,
    dataViewMock
  );

  it('should set error.message to painless reason', () => {
    expect(painlessError.message).toEqual(
      'Error executing runtime field or scripted field on data view logs'
    );
  });

  it('should render error message', () => {
    const searchErrorDisplay = renderSearchError(painlessError);
    expect(searchErrorDisplay).not.toBeUndefined();

    renderWithKibanaRenderContext(searchErrorDisplay?.body);

    expect(
      screen.getByText('Error executing runtime field or scripted field on data view logs')
    ).toBeVisible();
    expect(screen.getByText('cannot resolve symbol [invalid]')).toBeVisible();
    expect(screen.getByTestId('painlessStackTrace')).toHaveTextContent('invalid');
    expect(screen.getByTestId('painlessStackTrace')).toHaveTextContent('^---- HERE');
  });

  it('should return 2 actions', () => {
    const searchErrorDisplay = renderSearchError(painlessError);

    expect(searchErrorDisplay).not.toBeUndefined();
    expect(searchErrorDisplay?.actions?.length).toBe(2);
  });
});
