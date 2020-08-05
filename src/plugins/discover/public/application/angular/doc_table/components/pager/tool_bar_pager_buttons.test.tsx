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
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ToolBarPagerButtons } from './tool_bar_pager_buttons';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

test('it renders ToolBarPagerButtons', () => {
  const props = {
    hasPreviousPage: true,
    hasNextPage: true,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = shallowWithIntl(<ToolBarPagerButtons {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders ToolBarPagerButtons with clickable next and previous button', () => {
  const props = {
    hasPreviousPage: true,
    hasNextPage: true,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  findTestSubject(wrapper, 'btnPrevPage').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(1);
  findTestSubject(wrapper, 'btnNextPage').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(1);
});

test('it renders ToolBarPagerButtons with disabled next and previous button', () => {
  const props = {
    hasPreviousPage: false,
    hasNextPage: false,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  findTestSubject(wrapper, 'btnPrevPage').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(0);
  findTestSubject(wrapper, 'btnNextPage').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(0);
});
