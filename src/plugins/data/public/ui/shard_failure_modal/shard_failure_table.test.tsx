/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ShardFailureTable } from './shard_failure_table';
import { shardFailureResponse } from './__mocks__/shard_failure_response';
import { ShardFailure } from './shard_failure_types';

describe('ShardFailureTable', () => {
  it('renders matching snapshot given valid properties', () => {
    const failures = (shardFailureResponse._shards as any).failures as ShardFailure[];
    const component = shallowWithIntl(<ShardFailureTable failures={failures} />);
    expect(component).toMatchSnapshot();
  });
});
