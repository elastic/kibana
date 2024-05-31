/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement } from 'react';
import type { CoreStart } from '@kbn/core/public';
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

describe('Tsdb error', () => {
  const tsdbError = createEsError(
    {
      statusCode: 400,
      message: 'search_phase_execution_exception',
      attributes: {
        error: {
          type: 'status_exception',
          reason: 'error while executing search',
          caused_by: {
            type: 'search_phase_execution_exception',
            reason: 'all shards failed',
            phase: 'query',
            grouped: true,
            failed_shards: [
              {
                shard: 0,
                index: 'tsdb_index',
                reason: {
                  type: 'illegal_argument_exception',
                  reason:
                    'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
                },
              },
            ],
            caused_by: {
              type: 'illegal_argument_exception',
              reason:
                'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
              caused_by: {
                type: 'illegal_argument_exception',
                reason:
                  'Field [bytes_counter] of type [long][counter] is not supported for aggregation [sum]',
              },
            },
          },
        },
      },
    },
    () => {},
    servicesMock
  );

  test('should set error.message to tsdb reason', () => {
    expect(tsdbError.message).toEqual(
      'The field [bytes_counter] of Time series type [counter] has been used with the unsupported operation [sum].'
    );
  });

  test('should render error message', () => {
    const searchErrorDisplay = renderSearchError(tsdbError);
    expect(searchErrorDisplay).not.toBeUndefined();
    const wrapper = shallow(searchErrorDisplay?.body as ReactElement);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return 1 actions', () => {
    const searchErrorDisplay = renderSearchError(tsdbError);
    expect(searchErrorDisplay).not.toBeUndefined();
    expect(searchErrorDisplay?.actions?.length).toBe(1);
  });
});
