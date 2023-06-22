/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { currentSuggestionMock, allSuggestionsMock } from '../__mocks__/suggestions';
import { SuggestionSelector } from './suggestion_selector';

describe('SuggestionSelector', () => {
  it('should pass the suggestions charts titles to the EuiComboBox', () => {
    const onSuggestionChange = jest.fn();
    const wrapper = mountWithIntl(
      <SuggestionSelector
        suggestions={allSuggestionsMock}
        activeSuggestion={currentSuggestionMock}
        onSuggestionChange={onSuggestionChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('options')).toEqual(
      allSuggestionsMock.map((sug) => {
        return {
          label: sug.title,
          value: sug.title,
        };
      })
    );
  });

  it('should pass the current suggestion as selectedProps to the EuiComboBox', () => {
    const onSuggestionChange = jest.fn();
    const wrapper = mountWithIntl(
      <SuggestionSelector
        suggestions={allSuggestionsMock}
        activeSuggestion={currentSuggestionMock}
        onSuggestionChange={onSuggestionChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('selectedOptions')).toEqual([
      { label: currentSuggestionMock.title, value: currentSuggestionMock.title },
    ]);
  });

  it('should call onSuggestionChange when the user selects another suggestion', () => {
    const onSuggestionChange = jest.fn();
    const wrapper = mountWithIntl(
      <SuggestionSelector
        suggestions={allSuggestionsMock}
        activeSuggestion={currentSuggestionMock}
        onSuggestionChange={onSuggestionChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    const selectedSuggestion = allSuggestionsMock.find((sug) => sug.title === 'Donut')!;
    comboBox.prop('onChange')!([
      { label: selectedSuggestion.title, value: selectedSuggestion.title },
    ]);
    expect(onSuggestionChange).toHaveBeenCalledWith(selectedSuggestion);
  });
});
