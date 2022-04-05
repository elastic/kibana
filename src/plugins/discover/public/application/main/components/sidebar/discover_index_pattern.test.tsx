/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { ShallowWrapper } from 'enzyme';
import { ChangeIndexPattern } from './change_indexpattern';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObject } from 'kibana/server';
import { DiscoverIndexPattern, DiscoverIndexPatternProps } from './discover_index_pattern';
import { EuiSelectable } from '@elastic/eui';
import type { DataView, DataViewAttributes } from 'src/plugins/data_views/public';
import { indexPatternsMock } from '../../../../__mocks__/index_patterns';

const indexPattern = {
  id: 'the-index-pattern-id-first',
  title: 'test1 title',
} as DataView;

const indexPattern1 = {
  id: 'the-index-pattern-id-first',
  attributes: {
    title: 'test1 title',
  },
} as SavedObject<DataViewAttributes>;

const indexPattern2 = {
  id: 'the-index-pattern-id',
  attributes: {
    title: 'test2 title',
  },
} as SavedObject<DataViewAttributes>;

const defaultProps = {
  indexPatternList: [indexPattern1, indexPattern2],
  selectedIndexPattern: indexPattern,
  useNewFieldsApi: true,
  indexPatterns: indexPatternsMock,
  onChangeIndexPattern: jest.fn(),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      onChangeIndexPattern: jest.fn(),
    } as unknown as DiscoverIndexPatternProps;

    expect(shallow(<DiscoverIndexPattern {...props} />)).toMatchSnapshot(`""`);
  });
  test('should list all index patterns', () => {
    const instance = shallow(<DiscoverIndexPattern {...defaultProps} />);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    expect(defaultProps.onChangeIndexPattern).toHaveBeenCalledWith('the-index-pattern-id');
  });
});
