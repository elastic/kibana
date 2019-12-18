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
import { shallowWithIntl as shallow } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-ignore
import { ShallowWrapper } from 'enzyme';
import { ChangeIndexPattern } from './change_indexpattern';
import { SavedObject } from 'kibana/server';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { EuiSelectable, EuiSelectableList } from '@elastic/eui';

const indexPattern1 = {
  id: 'test1',
  attributes: {
    title: 'test1 title',
  },
} as SavedObject;

const indexPattern2 = {
  id: 'test2',
  attributes: {
    title: 'test2 title',
  },
} as SavedObject;

const defaultProps = {
  indexPatternList: [indexPattern1, indexPattern2],
  selectedIndexPattern: indexPattern1,
  setIndexPattern: jest.fn(async () => {}),
};

function getIndexPatternPickerList(instance: ShallowWrapper) {
  return findTestSubject(instance.find(ChangeIndexPattern), `indexPattern-switcher`);
}

function getIndexPatternPickerOptions(instance: ShallowWrapper) {
  return getIndexPatternPickerList(instance)
    .dive()
    .find(EuiSelectableList)
    .prop('options');
}

function selectIndexPatternPickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getIndexPatternPickerOptions(
    instance
  ).map(option =>
    option.label === selectedLabel
      ? { ...option, checked: 'on' }
      : { ...option, checked: undefined }
  );
  return getIndexPatternPickerList(instance).prop('onChange')!(options);
}

describe('DiscoverIndexPattern', () => {
  test('Invalid props dont cause an exception', () => {
    const props = {
      indexPatternList: null,
      selectedIndexPattern: null,
      setIndexPattern: jest.fn(),
    } as any;

    expect(shallow(<DiscoverIndexPattern {...props} />)).toMatchSnapshot(`""`);
  });
  test('should list all index patterns', () => {
    const instance = shallow(<DiscoverIndexPattern {...defaultProps} />);

    expect(getIndexPatternPickerOptions(instance)!.map(option => option.label)).toEqual([
      'test1 title',
      'test2 title',
    ]);
  });

  test('should switch data panel to target index pattern', () => {
    const instance = shallow(<DiscoverIndexPattern {...defaultProps} />);

    selectIndexPatternPickerOption(instance, 'test2 title');
    expect(defaultProps.setIndexPattern).toHaveBeenCalledWith('test2');
  });
});
