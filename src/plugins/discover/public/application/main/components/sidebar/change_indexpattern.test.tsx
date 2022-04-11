/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiSelectable } from '@elastic/eui';
import { ShallowWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ChangeIndexPattern } from './change_indexpattern';
import { indexPatternMock } from '../../../../__mocks__/index_pattern';
import { indexPatternWithTimefieldMock } from '../../../../__mocks__/index_pattern_with_timefield';
import { IndexPatternRef } from './types';

function getProps() {
  return {
    indexPatternId: indexPatternMock.id,
    indexPatternRefs: [
      indexPatternMock as IndexPatternRef,
      indexPatternWithTimefieldMock as IndexPatternRef,
    ],
    onChangeIndexPattern: jest.fn(),
    trigger: {
      label: indexPatternMock.getName(),
      title: indexPatternMock.title,
      'data-test-subj': 'indexPattern-switch-link',
    },
  };
}

function getIndexPatternPickerList(instance: ShallowWrapper) {
  return instance.find(EuiSelectable).first();
}

function getIndexPatternPickerOptions(instance: ShallowWrapper) {
  return getIndexPatternPickerList(instance).prop('options');
}

export function selectIndexPatternPickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getIndexPatternPickerOptions(
    instance
  ).map((option: { label: string }) =>
    option.label === selectedLabel
      ? { ...option, checked: 'on' }
      : { ...option, checked: undefined }
  );
  return getIndexPatternPickerList(instance).prop('onChange')!(options);
}

describe('ChangeIndexPattern', () => {
  test('switching index pattern to the same index pattern does not trigger onChangeIndexPattern', async () => {
    const props = getProps();
    const comp = shallowWithIntl(<ChangeIndexPattern {...props} />);
    await act(async () => {
      selectIndexPatternPickerOption(comp, indexPatternMock.getName());
    });
    expect(props.onChangeIndexPattern).toHaveBeenCalledTimes(0);
  });
  test('switching index pattern to a different index pattern triggers onChangeIndexPattern', async () => {
    const props = getProps();
    const comp = shallowWithIntl(<ChangeIndexPattern {...props} />);
    await act(async () => {
      selectIndexPatternPickerOption(comp, indexPatternWithTimefieldMock.getName());
    });
    expect(props.onChangeIndexPattern).toHaveBeenCalledTimes(1);
    expect(props.onChangeIndexPattern).toHaveBeenCalledWith(indexPatternWithTimefieldMock.id);
  });
});
