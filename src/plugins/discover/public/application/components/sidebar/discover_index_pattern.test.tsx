/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test/jest';

// @ts-ignore
import { ShallowWrapper } from 'enzyme';
import { ChangeIndexPattern } from './change_indexpattern';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { EuiSelectable } from '@elastic/eui';
import { IIndexPattern, IndexPatternSpec } from 'src/plugins/data/public';

const indexPattern: IIndexPattern = {
  fields: [{ name: 'name', type: 'type' }],
  id: 'test1',
  patternList: ['logstash-*'],
  patternListActive: ['logstash-*'],
  title: 'test1 title',
};

const indexPattern1: IndexPatternSpec = {
  id: 'test1',
  patternList: ['logstash-*'],
  patternListActive: ['logstash-*'],
  title: 'test1 title',
};

const indexPattern2: IndexPatternSpec = {
  id: 'test2',
  patternList: ['logstash-*'],
  patternListActive: ['logstash-*'],
  title: 'test2 title',
};

const defaultProps = {
  indexPatternList: [indexPattern1, indexPattern2],
  selectedIndexPattern: indexPattern,
  setIndexPattern: jest.fn(async () => {}),
};

function getIndexPatternPickerList(instance: ShallowWrapper) {
  return instance.find(ChangeIndexPattern).first().dive().find(EuiSelectable);
}

function getIndexPatternPickerOptions(instance: ShallowWrapper) {
  return getIndexPatternPickerList(instance).prop('options');
}

function selectIndexPatternPickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getIndexPatternPickerOptions(
    instance
  ).map((option: any) =>
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

    expect(getIndexPatternPickerOptions(instance)!.map((option: any) => option.label)).toEqual([
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
