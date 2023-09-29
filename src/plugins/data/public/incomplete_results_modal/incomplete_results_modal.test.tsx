/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchResponseIncompleteWarning } from '../search';
import { IncompleteResultsModal } from './incomplete_results_modal';

describe('IncompleteResultsModal', () => {
  test('should render shard failures', () => {
    const component = shallow(
      <IncompleteResultsModal
        warning={{} as unknown as SearchResponseIncompleteWarning}
        request={{}}
        response={
          {
            _shards: {
              total: 4,
              successful: 3,
              skipped: 0,
              failed: 1,
              failures: [
                {
                  shard: 0,
                  index: 'sample-01-rollup',
                  node: 'VFTFJxpHSdaoiGxJFLSExQ',
                  reason: {
                    type: 'illegal_argument_exception',
                    reason:
                      'Field [kubernetes.container.memory.available.bytes] of type [aggregate_metric_double] is not supported for aggregation [percentiles]',
                  },
                },
              ],
            },
          } as unknown as estypes.SearchResponse<any>
        }
        onClose={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('should render time out', () => {
    const component = shallow(
      <IncompleteResultsModal
        warning={{} as unknown as SearchResponseIncompleteWarning}
        request={{}}
        response={
          {
            timed_out: true,
            _shards: {
              total: 4,
              successful: 4,
              skipped: 0,
              failed: 0,
            },
          } as unknown as estypes.SearchResponse<any>
        }
        onClose={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
