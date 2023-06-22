/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { MouseEvent } from 'react';
import { EuiSelectable } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { ShallowWrapper } from 'enzyme';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import TextBasedLanguagesList, { TextBasedLanguagesListProps } from './text_languages_list';
import { TextBasedLanguages } from './data_view_picker';

function getTextLanguagesPickerList(instance: ShallowWrapper) {
  return instance.find(EuiSelectable).first();
}

function getTextLanguagesPickerOptions(instance: ShallowWrapper) {
  return getTextLanguagesPickerList(instance).prop('options');
}

function selectTextLanguagePickerOption(instance: ShallowWrapper, selectedLabel: string) {
  const event = {} as MouseEvent;
  const options: Array<{ label: string; checked?: 'on' | 'off' }> = getTextLanguagesPickerOptions(
    instance
  ).map((option: { label: string }) =>
    option.label === selectedLabel
      ? { ...option, checked: 'on' }
      : { ...option, checked: undefined }
  );
  const selectedOption = { label: selectedLabel };
  return getTextLanguagesPickerList(instance).prop('onChange')!(options, event, selectedOption);
}

describe('Text based languages list component', () => {
  const changeLanguageSpy = jest.fn();
  let props: TextBasedLanguagesListProps;
  beforeEach(() => {
    props = {
      selectedOption: 'ESQL',
      onChange: changeLanguageSpy,
      textBasedLanguages: [TextBasedLanguages.ESQL, TextBasedLanguages.SQL],
    };
  });
  it('should trigger the onChange if a new language is selected', async () => {
    const component = shallow(<TextBasedLanguagesList {...props} />);
    await act(async () => {
      selectTextLanguagePickerOption(component, 'SQL');
    });
    expect(changeLanguageSpy).toHaveBeenCalled();
  });

  it('should list all languages', () => {
    const component = shallow(<TextBasedLanguagesList {...props} />);

    expect(getTextLanguagesPickerOptions(component)!.map((option: any) => option.label)).toEqual([
      'ESQL',
      'SQL',
    ]);
  });
});
