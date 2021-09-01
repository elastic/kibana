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

import { AutocompleteFieldMatchAnyComponent } from '.';
import { getField, fields } from '../fields/index.mock';
import { useFieldValueAutocomplete } from '../hooks/use_field_value_autocomplete';
import { autocompleteStartMock } from '../autocomplete/index.mock';

jest.mock('../hooks/use_field_value_autocomplete', () => {
  const actual = jest.requireActual('../hooks/use_field_value_autocomplete');
  return {
    ...actual,
    useFieldValueAutocomplete: jest.fn(),
  };
});

describe('AutocompleteFieldMatchAnyComponent', () => {
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

  test('it renders disabled if "isDisabled" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['127.0.0.1']}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={true}
        onChange={jest.fn()}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={[]}
      />
    );
    wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] button`).at(0).simulate('click');
    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteMatchAny-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
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
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['127.0.0.1']}
      />
    );

    expect(
      wrapper
        .find(`[data-test-subj="comboBoxInput"]`)
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected value', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
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
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={['127.0.0.1']}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="valuesAutocompleteMatchAny"] EuiComboBoxPill`).at(0).text()
    ).toEqual('127.0.0.1');
  });

  test('it invokes "onChange" when new value created', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
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
        rowLabel={'Row Label'}
        selectedField={getField('ip')}
        selectedValue={[]}
      />
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onCreateOption: (a: string) => void;
    }).onCreateOption('127.0.0.1');

    expect(mockOnChange).toHaveBeenCalledWith(['127.0.0.1']);
  });

  test('it invokes "onChange" when new value selected', async () => {
    const mockOnChange = jest.fn();
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
          getValueSuggestions: getValueSuggestionsMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isLoading={false}
        isClearable={false}
        isDisabled={false}
        onChange={mockOnChange}
        onError={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('machine.os.raw')}
        selectedValue={[]}
      />
    );

    ((wrapper.find(EuiComboBox).props() as unknown) as {
      onChange: (a: EuiComboBoxOptionOption[]) => void;
    }).onChange([{ label: 'value 1' }]);

    expect(mockOnChange).toHaveBeenCalledWith(['value 1']);
  });

  test('it refreshes autocomplete with search query when new value searched', () => {
    wrapper = mount(
      <AutocompleteFieldMatchAnyComponent
        autocompleteService={{
          ...autocompleteStartMock,
        }}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        rowLabel={'Row Label'}
        selectedField={getField('machine.os.raw')}
        selectedValue={[]}
      />
    );
    act(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onSearchChange: (a: string) => void;
      }).onSearchChange('value 1');
    });
    expect(useFieldValueAutocomplete).toHaveBeenCalledWith({
      autocompleteService: autocompleteStartMock,
      fieldValue: [],
      indexPattern: {
        fields,
        id: '1234',
        title: 'logstash-*',
      },
      operatorType: 'match_any',
      query: 'value 1',
      selectedField: getField('machine.os.raw'),
    });
  });
});
