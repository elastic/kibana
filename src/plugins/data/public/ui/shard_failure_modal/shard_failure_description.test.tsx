/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
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
