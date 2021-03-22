/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallowWithIntl as shallow } from '@kbn/test/jest';
import { ShallowWrapper } from 'enzyme';
import { ChangeIndexPattern } from './change_indexpattern';
import { SavedObject } from 'kibana/server';
import { DiscoverIndexPattern, DiscoverIndexPatternProps } from './discover_index_pattern';
import { EuiSelectable } from '@elastic/eui';
import { IndexPattern } from 'src/plugins/data/public';
import { configMock } from '../../../__mocks__/config';
import { indexPatternsMock } from '../../../__mocks__/index_patterns';

const indexPattern = {
  id: 'the-index-pattern-id-first',
  title: 'test1 title',
} as IndexPattern;

const indexPattern1 = {
  id: 'the-index-pattern-id-first',
  attributes: {
    title: 'test1 title',
  },
} as SavedObject<any>;

const indexPattern2 = {
  id: 'the-index-pattern-id',
  attributes: {
    title: 'test2 title',
  },
} as SavedObject<any>;

const defaultProps = {
  config: configMock,
  indexPatternList: [indexPattern1, indexPattern2],
  selectedIndexPattern: indexPattern,
  state: {},
  setAppState: jest.fn(),
  useNewFieldsApi: true,
  indexPatterns: indexPatternsMock,
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
    const props = ({
      indexPatternList: null,
      selectedIndexPattern: null,
      setIndexPattern: jest.fn(),
    } as unknown) as DiscoverIndexPatternProps;

    expect(shallow(<DiscoverIndexPattern {...props} />)).toMatchSnapshot(`""`);
  });
  test('should list all index patterns', () => {
    const instance = shallow(<DiscoverIndexPattern {...defaultProps} />);

    expect(getIndexPatternPickerOptions(instance)!.map((option: any) => option.label)).toEqual([
      'test1 title',
      'test2 title',
    ]);
  });

  test('should switch data panel to target index pattern', async () => {
    const instance = shallow(<DiscoverIndexPattern {...defaultProps} />);
    await act(async () => {
      selectIndexPatternPickerOption(instance, 'test2 title');
    });
    expect(defaultProps.setAppState).toHaveBeenCalledWith({
      index: 'the-index-pattern-id',
      columns: [],
      sort: [],
    });
  });
});
