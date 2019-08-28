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
import { openModal } from './shard_failure_open_modal_button.test.mocks';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ShardFailureOpenModalButton } from './shard_failure_open_modal_button';
import { shardFailureRequest } from './__mocks__/shard_failure_request';
import { shardFailureResponse } from './__mocks__/shard_failure_response';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

describe('ShardFailureOpenModalButton', () => {
  it('triggers the openModal function when "Show details" button is clicked', () => {
    const component = mountWithIntl(
      <ShardFailureOpenModalButton
        request={shardFailureRequest}
        response={shardFailureResponse}
        title="test"
      />
    );
    findTestSubject(component, 'openShardFailureModalBtn').simulate('click');
    expect(openModal).toHaveBeenCalled();
  });
});
