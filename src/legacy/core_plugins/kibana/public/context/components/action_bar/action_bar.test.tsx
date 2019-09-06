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
    defaultStepSize: 10,
    docCount: 20,
    docCountAvailable: 0,
    isDisabled: false,
    isLoading: false,
    onChangeCount: jest.fn(),
    onLoadMoreClick: jest.fn(),
    type: 'successor',
  } as ActionBarProps;
  const wrapper = mountWithIntl(<ActionBar {...props} />);

  test('Count input', () => {
    expect(findTestSubject(wrapper, 'successorCountPicker').props().value).toBe(20);
    findTestSubject(wrapper, 'successorCountPicker').simulate('change', { target: { value: 123 } });
    expect(props.onChangeCount).toHaveBeenCalledTimes(1);
  });

  test('Load button ', () => {
    findTestSubject(wrapper, 'successorLoadMoreButton').simulate('click');
    expect(props.onLoadMoreClick).toHaveBeenCalledTimes(1);
  });

  test('Warning about limitation of additional records', () => {
    expect(findTestSubject(wrapper, 'successorWarningMsg').text()).toBe(
      'No documents newer than the anchor could be found.'
    );
  });
});

describe('Test Discover Context ActionBar for predecessor records', () => {
  const props = {
    docCount: 20,
    docCountAvailable: 1,
    defaultStepSize: 7,
    isDisabled: false,
    isLoading: false,
    onChangeCount: jest.fn(),
    onLoadMoreClick: jest.fn(),
    type: 'predecessor',
  } as ActionBarProps;
  const wrapper = mountWithIntl(<ActionBar {...props} />);

  test('Count input', () => {
    expect(findTestSubject(wrapper, 'predecessorCountPicker').props().value).toBe(20);
    findTestSubject(wrapper, 'predecessorCountPicker').simulate('change', {
      target: { value: 123 },
    });
    expect(props.onChangeCount).toHaveBeenCalledTimes(1);
  });

  test('Load button ', () => {
    findTestSubject(wrapper, 'predecessorLoadMoreButton').simulate('click');
    expect(props.onLoadMoreClick).toHaveBeenCalledTimes(1);
  });

  test('Warning about limitation of additional records', () => {
    expect(findTestSubject(wrapper, 'predecessorWarningMsg').text()).toBe(
      'Only 1 documents older than the anchor could be found.'
    );
  });
});
