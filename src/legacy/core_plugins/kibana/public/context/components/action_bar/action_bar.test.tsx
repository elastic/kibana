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
import { ActionBar, ActionBarProps } from './action_bar';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

describe('Test Discover Context ActionBar for successor records', () => {
  const props = {
    defaultStepSize: 5,
    docCount: 20,
    docCountAvailable: 0,
    isDisabled: false,
    isLoading: false,
    onChangeCount: jest.fn(),
    type: 'successors',
  } as ActionBarProps;
  const wrapper = mountWithIntl(<ActionBar {...props} />);

  test('Load button ', () => {
    findTestSubject(wrapper, 'successorsLoadMoreButton').simulate('click');
    expect(props.onChangeCount).toHaveBeenCalledWith(25);
  });

  test('Count input', () => {
    expect(findTestSubject(wrapper, 'successorsCountPicker').props().value).toBe(25);
    findTestSubject(wrapper, 'successorsCountPicker').simulate('change', {
      target: { value: '123' },
    });
    findTestSubject(wrapper, 'successorsCountPicker').simulate('blur');
    expect(props.onChangeCount).toHaveBeenCalledTimes(2);
    findTestSubject(wrapper, 'successorsCountPicker').simulate('submit');
    expect(props.onChangeCount).toHaveBeenCalledTimes(3);
  });

  test('Warning about limitation of additional records', () => {
    expect(findTestSubject(wrapper, 'successorsWarningMsg').text()).toBe(
      'No documents older than the anchor could be found.'
    );
  });
});

describe('Test Discover Context ActionBar for predecessor records', () => {
  const props = {
    defaultStepSize: 5,
    docCount: 20,
    docCountAvailable: 1,
    isDisabled: false,
    isLoading: false,
    onChangeCount: jest.fn(),
    onLoadMoreClick: jest.fn(),
    type: 'predecessors',
  } as ActionBarProps;
  const wrapper = mountWithIntl(<ActionBar {...props} />);

  test('Load button ', () => {
    findTestSubject(wrapper, 'predecessorsLoadMoreButton').simulate('click');
    expect(props.onChangeCount).toHaveBeenCalledTimes(1);
  });

  test('Count input', () => {
    expect(findTestSubject(wrapper, 'predecessorsCountPicker').props().value).toBe(25);
    findTestSubject(wrapper, 'predecessorsCountPicker').simulate('change', {
      target: { value: 123 },
    });
    findTestSubject(wrapper, 'predecessorsCountPicker').simulate('blur');
    expect(props.onChangeCount).toHaveBeenCalledTimes(2);
    findTestSubject(wrapper, 'predecessorsCountPicker').simulate('submit');
    expect(props.onChangeCount).toHaveBeenCalledTimes(3);
  });

  test('Warning about limitation of additional records', () => {
    expect(findTestSubject(wrapper, 'predecessorsWarningMsg').text()).toBe(
      'Only 1 documents newer than the anchor could be found.'
    );
  });
});
