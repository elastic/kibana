/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createEsError } from './create_es_error';
import { renderSearchError } from './render_search_error';
import { shallow } from 'enzyme';
import { coreMock } from '@kbn/core/public/mocks';

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
  title: 'logs',
  id: '1234',
} as unknown as DataView;

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

  test('should set error.message to painless reason', () => {
    expect(painlessError.message).toEqual(
      'Error executing runtime field or scripted field on data view logs'
    );
  });

  test('should render error message', () => {
    const searchErrorDisplay = renderSearchError(painlessError);
    expect(searchErrorDisplay).not.toBeUndefined();
    const wrapper = shallow(searchErrorDisplay?.body as ReactElement);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return 2 actions', () => {
    const searchErrorDisplay = renderSearchError(painlessError);
    expect(searchErrorDisplay).not.toBeUndefined();
    expect(searchErrorDisplay?.actions?.length).toBe(2);
  });
});
