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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ToolBarPagerButtons } from './tool_bar_pager_buttons';

test('it renders ToolBarPagerButtons with next and previous page', () => {
  const props = {
    hasPreviousPage: true,
    hasNextPage: true,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  // expect(wrapper).toMatchSnapshot();
  wrapper.find('[data-test-subj="btnPrevPage"]').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(1);
  wrapper.find('[data-test-subj="btnNextPage"]').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(1);
});

test('it renders ToolBarPagerButtons with no next and no previous page', () => {
  const props = {
    hasPreviousPage: false,
    hasNextPage: false,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  wrapper.find('[data-test-subj="btnPrevPage"]').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(0);
  wrapper.find('[data-test-subj="btnNextPage"]').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(0);
  expect(wrapper).toMatchSnapshot();
});
