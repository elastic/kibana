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
import { ShardFailureModal } from './shard_failure_modal';
import { shardFailureRequest } from './__mocks__/shard_failure_request';
import { shardFailureResponse } from './__mocks__/shard_failure_response';

describe('ShardFailureModal', () => {
  it('renders matching snapshot given valid properties', () => {
    const component = shallowWithIntl(
      <ShardFailureModal
        title="test"
        request={shardFailureRequest}
        response={shardFailureResponse}
        onClose={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
