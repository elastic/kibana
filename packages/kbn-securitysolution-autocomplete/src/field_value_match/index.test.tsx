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
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormHelpText,
  EuiSuperSelect,
} from '@elastic/eui';
import { act, waitFor } from '@testing-library/react';
import { AutocompleteFieldMatchComponent } from '.';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import { fields, getField } from '../fields/index.mock';
import { autocompleteStartMock } from '../autocomplete/index.mock';

jest.mock('../hooks/use_field_value_autocomplete');
jest.mock('../translations', () => ({
  FIELD_SPACE_WARNING: 'Warning: there is a space',
}));
describe('AutocompleteFieldMatchComponent', () => {
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
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue="127.0.0.1"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatchLabel"] label').at(0).text()
    ).toEqual('Row Label');
  });

  test('it renders disabled if "isDisabled" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="127.0.0.1"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatch"] input').prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="127.0.0.1"
      />
    );
    wrapper.find('[data-test-subj="valuesAutocompleteMatch"] button').at(0).simulate('click');
    expect(
      wrapper
        .find('EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteMatch-optionsList"]')
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="127.0.0.1"
      />
    );

    expect(wrapper.find(`[data-test-subj="comboBoxClearButton"]`)).toBeTruthy();
  });

  test('it correctly displays selected value', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="127.0.0.1"
      />
    );

    expect(
      wrapper.find('[data-test-subj="valuesAutocompleteMatch"] input').at(0).props().value
    ).toEqual('127.0.0.1');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue=""
      />
    );

    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onCreateOption: (a: string) => void;
      }
    ).onCreateOption('127.0.0.1');

    expect(mockOnChange).toHaveBeenCalledWith('127.0.0.1');
  });

  test('it invokes "onChange" when new value selected', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
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

  test('should show the warning helper text if the new value contains spaces when change', async () => {
    (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
      false,
      true,
      [' value 1 ', 'value 2'],
      getValueSuggestionsMock,
    ]);
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        rowLabel="Test"
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
        selectedValue=""
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

  test('it refreshes autocomplete with search query when new value searched', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
        selectedValue=""
      />
    );
    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onSearchChange: (a: string) => void;
        }
      ).onSearchChange('value 1');
    });

    expect(useFieldValueAutocomplete).toHaveBeenCalledWith({
      autocompleteService: autocompleteStartMock,
      fieldValue: '',
      indexPattern: {
        fields,
        id: '1234',
        title: 'logstash-*',
      },
      operatorType: 'match',
      query: 'value 1',
      selectedField: getField('machine.os.raw'),
    });
  });
  test('should show the warning helper text if the new value contains spaces when searching a new query', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
        selectedValue=""
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
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
        selectedValue=" leading and trailing space "
      />
    );
    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeTruthy();
    expect(euiFormHelptext.text()).toEqual('Warning: there is a space');
  });
  test('should not show the warning helper text if selectedValue is falsy', () => {
    wrapper = mount(
      <AutocompleteFieldMatchComponent
        autocompleteService={autocompleteStartMock}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
        selectedValue=""
      />
    );
    const euiFormHelptext = wrapper.find(EuiFormHelpText);
    expect(euiFormHelptext.length).toBeFalsy();
  });

  describe('boolean type', () => {
    const valueSuggestionsMock = jest.fn().mockResolvedValue([false, false, [], jest.fn()]);

    beforeEach(() => {
      (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
        false,
        false,
        [],
        valueSuggestionsMock,
      ]);
    });

    test('it displays only two options - "true" or "false"', () => {
      wrapper = mount(
        <AutocompleteFieldMatchComponent
          autocompleteService={autocompleteStartMock}
          indexPattern={{
            fields,
            id: '1234',
            title: 'logstash-*',
          }}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          onChange={jest.fn()}
          onError={jest.fn()}
          placeholder="Placeholder text"
          selectedField={getField('ssl')}
          selectedValue=""
        />
      );
      expect(
        wrapper.find('[data-test-subj="valuesAutocompleteMatchBoolean"]').exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="valuesAutocompleteMatchBoolean"]').at(0).prop('options')
      ).toEqual([
        {
          inputDisplay: 'true',
          value: 'true',
        },
        {
          inputDisplay: 'false',
          value: 'false',
        },
      ]);
    });

    test('it invokes "onChange" with "true" when selected', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <AutocompleteFieldMatchComponent
          autocompleteService={autocompleteStartMock}
          indexPattern={{
            fields,
            id: '1234',
            title: 'logstash-*',
          }}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          onChange={mockOnChange}
          onError={jest.fn()}
          placeholder="Placeholder text"
          selectedField={getField('ssl')}
          selectedValue=""
        />
      );

      (
        wrapper.find(EuiSuperSelect).props() as unknown as {
          onChange: (a: string) => void;
        }
      ).onChange('true');

      expect(mockOnChange).toHaveBeenCalledWith('true');
    });

    test('it invokes "onChange" with "false" when selected', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <AutocompleteFieldMatchComponent
          autocompleteService={autocompleteStartMock}
          indexPattern={{
            fields,
            id: '1234',
            title: 'logstash-*',
          }}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          onChange={mockOnChange}
          onError={jest.fn()}
          placeholder="Placeholder text"
          selectedField={getField('ssl')}
          selectedValue=""
        />
      );

      (
        wrapper.find(EuiSuperSelect).props() as unknown as {
          onChange: (a: string) => void;
        }
      ).onChange('false');

      expect(mockOnChange).toHaveBeenCalledWith('false');
    });
  });

  describe('number type', () => {
    const valueSuggestionsMock = jest.fn().mockResolvedValue([false, false, [], jest.fn()]);

    beforeEach(() => {
      (useFieldValueAutocomplete as jest.Mock).mockReturnValue([
        false,
        false,
        [],
        valueSuggestionsMock,
      ]);
    });

    test('it number input when field type is number', () => {
      wrapper = mount(
        <AutocompleteFieldMatchComponent
          autocompleteService={autocompleteStartMock}
          indexPattern={{
            fields,
            id: '1234',
            title: 'logstash-*',
          }}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          onChange={jest.fn()}
          onError={jest.fn()}
          placeholder="Placeholder text"
          selectedField={getField('bytes')}
          selectedValue=""
        />
      );

      expect(
        wrapper.find('[data-test-subj="valueAutocompleteFieldMatchNumber"]').exists()
      ).toBeTruthy();
    });

    test('it invokes "onChange" with numeric value when inputted', () => {
      const mockOnChange = jest.fn();
      wrapper = mount(
        <AutocompleteFieldMatchComponent
          autocompleteService={autocompleteStartMock}
          indexPattern={{
            fields,
            id: '1234',
            title: 'logstash-*',
          }}
          isClearable={false}
          isDisabled={false}
          isLoading={false}
          onChange={mockOnChange}
          onError={jest.fn()}
          placeholder="Placeholder text"
          selectedField={getField('bytes')}
          selectedValue=""
        />
      );
      wrapper
        .find('[data-test-subj="valueAutocompleteFieldMatchNumber"] input')
        .at(0)
        .simulate('change', { target: { value: '8' } });

      expect(mockOnChange).toHaveBeenCalledWith('8');
    });
  });
});
