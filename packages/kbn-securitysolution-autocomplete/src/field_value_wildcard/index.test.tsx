/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { act } from '@testing-library/react';
import { AutocompleteFieldWildcardComponent } from '.';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import { fields, getField } from '../fields/index.mock';
import { autocompleteStartMock } from '../autocomplete/index.mock';
import { FILENAME_WILDCARD_WARNING, FILEPATH_WARNING } from '@kbn/securitysolution-utils';

jest.mock('../hooks/use_field_value_autocomplete');

describe('AutocompleteFieldWildcardComponent', () => {
  let wrapper: ReactWrapper;

  const getValueSuggestionsMock = jest
    .fn()
    .mockResolvedValue([false, true, ['value 3', 'value 4'], jest.fn()]);

  beforeEach(() => {
    (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
      false,
      true,
      ['value 1', 'value 2'],
      getValueSuggestionsMock,
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('it renders row label if one passed in', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('file.path.text')}
        selectedValue="/opt/bin/app.dmg"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteWildcardLabel"] label').at(0).text()
    ).toEqual('Row Label');
  });

  test('it renders disabled if "isDisabled" is true', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="/opt/*/app.dmg"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteWildcard"] input').prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="/opt/*/app.dmg"
      />
    );
    wrapper.find('[data-test-subj="valuesAutocompleteWildcard"] button').at(0).simulate('click');
    expect(
      wrapper
        .find('EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteWildcard-optionsList"]')
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="/opt/*/app.dmg"
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="comboBoxInput"]')
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected value', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="/opt/*/app.dmg"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteWildcard"] EuiComboBoxPill').at(0).text()
    ).toEqual('/opt/*/app.dmg');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue=""
      />
    );

    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onCreateOption: (a: string) => void;
      }
    ).onCreateOption('/opt/*/app.dmg');

    expect(mockOnChange).toHaveBeenCalledWith('/opt/*/app.dmg');
  });

  test('it invokes "onChange" when new value selected', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue=""
      />
    );

    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'value 1' }]);

    expect(mockOnChange).toHaveBeenCalledWith('value 1');
  });

  test('it refreshes autocomplete with search query when new value searched', () => {
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue=""
      />
    );
    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onSearchChange: (a: string) => void;
        }
      ).onSearchChange('A:\\Some Folder\\inc*.exe');
    });

    expect(useFieldValueAutocomplete).toHaveBeenCalledWith({
      autocompleteService: autocompleteStartMock,
      fieldValue: '',
      indexPattern: {
        fields,
        id: '1234',
        title: 'logs-endpoint.events.*',
      },
      operatorType: 'wildcard',
      query: 'A:\\Some Folder\\inc*.exe',
      selectedField: getField('file.path.text'),
    });
  });

  test('it does not invoke "onWarning" when no warning exists', () => {
    const mockOnWarning = jest.fn();
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={mockOnWarning}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="invalid path"
      />
    );

    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onBlur: () => void;
        }
      ).onBlur();
    });

    expect(mockOnWarning).not.toHaveBeenCalledWith(true);
  });

  test('it invokes "onWarning" when warning exists', () => {
    const mockOnWarning = jest.fn();
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={mockOnWarning}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="invalid path"
        warning={FILEPATH_WARNING}
      />
    );

    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onBlur: () => void;
        }
      ).onBlur();
    });

    expect(mockOnWarning).toHaveBeenCalledWith(true);
    expect(
      wrapper
        .find('[data-test-subj="valuesAutocompleteWildcardLabel"] div.euiFormHelpText')
        .at(0)
        .text()
    ).toEqual(FILEPATH_WARNING);
  });

  test('it invokes "onWarning" when warning exists and is wildcard warning', () => {
    const mockOnWarning = jest.fn();
    wrapper = mount(
      <AutocompleteFieldWildcardComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logs-endpoint.events.*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        onWarning={mockOnWarning}
        placeholder="Placeholder text"
        selectedField={getField('file.path.text')}
        selectedValue="invalid path"
        warning={FILENAME_WILDCARD_WARNING}
      />
    );

    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onBlur: () => void;
        }
      ).onBlur();
    });

    expect(mockOnWarning).toHaveBeenCalledWith(true);
    const helpText = wrapper
      .find('[data-test-subj="valuesAutocompleteWildcardLabel"] div.euiFormHelpText')
      .at(0);
    expect(helpText.text()).toEqual(FILENAME_WILDCARD_WARNING);
    expect(helpText.find('.euiToolTipAnchor')).toBeTruthy();
  });
});
