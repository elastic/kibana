/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormHelpText } from '@elastic/eui';
import { act, waitFor } from '@testing-library/react';
import { AutocompleteFieldWildcardComponent } from '.';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import { fields, getField } from '../fields/index.mock';
import { autocompleteStartMock } from '../autocomplete/index.mock';
import { WILDCARD_WARNING, FILEPATH_WARNING } from '@kbn/securitysolution-utils';

jest.mock('../hooks/use_field_value_autocomplete');
jest.mock('../translations', () => ({
  FIELD_SPACE_WARNING: 'Warning: there is a space',
}));
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

    expect(wrapper.find(`[data-test-subj="comboBoxClearButton"]`)).toBeTruthy();
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
      wrapper.find('[data-test-subj="valuesAutocompleteWildcard"] input').at(0).props().value
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
        warning={WILDCARD_WARNING}
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
    expect(helpText.text()).toEqual(WILDCARD_WARNING);
    expect(helpText.find('.euiToolTipAnchor')).toBeTruthy();
  });
  test('should show the warning helper text if the new value contains spaces when change', async () => {
    (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
      false,
      true,
      [' value 1 ', 'value 2'],
      getValueSuggestionsMock,
    ]);
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
        selectedValue="invalid path"
        warning={WILDCARD_WARNING}
      />
    );

    await waitFor(() =>
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: ' value 1 ' }])
    );
    wrapper.update();
    expect(mockOnChange).toHaveBeenCalledWith(' value 1 ');

    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeTruthy();
  });
  test('should show the warning helper text if the new value contains spaces when searching a new query', () => {
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
        selectedValue="invalid path"
        warning={''}
      />
    );
    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onSearchChange: (a: string) => void;
        }
      ).onSearchChange(' value 1');
    });

    wrapper.update();
    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeTruthy();
    expect(euiFormHelptext.text()).toEqual('Warning: there is a space');
  });
  test('should show the warning helper text if selectedValue contains spaces when editing', () => {
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
        selectedValue=" leading space"
        warning={''}
      />
    );
    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeTruthy();
    expect(euiFormHelptext.text()).toEqual('Warning: there is a space');
  });
  test('should not show the warning helper text if selectedValue is falsy', () => {
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
        warning={''}
      />
    );
    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeFalsy();
  });
});
