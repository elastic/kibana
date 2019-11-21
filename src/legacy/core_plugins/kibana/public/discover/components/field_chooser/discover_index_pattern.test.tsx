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
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { SavedObject } from 'kibana/server';
import { DiscoverIndexPattern, DiscoverIndexPatternProps } from './discover_index_pattern';
import { comboBoxKeyCodes } from '@elastic/eui';

const indexPattern1 = {
  id: 'test1',
  attributes: {
    title: 'test1',
  },
} as SavedObject;

const indexPattern2 = {
  id: 'test2',
  attributes: {
    title: 'test2',
  },
} as SavedObject;

describe('DiscoverIndexPattern', () => {
  test('Invalid props dont cause an exception', () => {
    const props = {
      indexPatternList: null,
      selectedIndexPattern: null,
      setIndexPattern: jest.fn(),
    } as any;

    expect(shallowWithIntl(<DiscoverIndexPattern {...props} />)).toMatchSnapshot(`""`);
  });
  test('A single index pattern is just displayed', () => {
    const props = {
      indexPatternList: [indexPattern1],
      selectedIndexPattern: indexPattern1,
      setIndexPattern: jest.fn(),
    } as DiscoverIndexPatternProps;

    expect(shallowWithIntl(<DiscoverIndexPattern {...props} />)).toMatchSnapshot();
  });

  test('Multiple index patterns are selectable', () => {
    const props = {
      indexPatternList: [indexPattern1, indexPattern2],
      selectedIndexPattern: indexPattern2,
      setIndexPattern: jest.fn(),
    } as DiscoverIndexPatternProps;
    const component = mountWithIntl(<DiscoverIndexPattern {...props} />);
    findTestSubject(component, 'indexPattern-switch-link').simulate('click');

    const searchInput = findTestSubject(component, 'comboBoxSearchInput');
    searchInput.simulate('change', { target: { value: 'test1' } });
    searchInput.simulate('keyDown', { keyCode: comboBoxKeyCodes.ENTER });
    expect(props.setIndexPattern).toBeCalledWith('test1');
  });
});
