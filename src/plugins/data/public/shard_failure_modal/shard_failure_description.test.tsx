/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ShardFailureDescription } from './shard_failure_description';
import { shardFailureResponse } from './__mocks__/shard_failure_response';
import { ShardFailure } from './shard_failure_types';

describe('ShardFailureDescription', () => {
  it('renders matching snapshot given valid properties', () => {
    // TODO: remove cast once https://github.com/elastic/elasticsearch-js/issues/1286 is resolved
    const failure = (shardFailureResponse._shards as any).failures[0] as ShardFailure;
    const component = shallowWithIntl(<ShardFailureDescription {...failure} />);
    expect(component).toMatchSnapshot();
  });
});
