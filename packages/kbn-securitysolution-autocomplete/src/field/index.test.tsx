/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { FieldComponent } from '.';
import { fields, getField } from '../fields/index.mock';

describe('field', () => {
  test('it renders disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <FieldComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] input`).prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', () => {
    const wrapper = mount(
      <FieldComponent
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={true}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] button`).at(0).simulate('click');
    expect(
      wrapper
        .find(`EuiComboBoxOptionsList[data-test-subj="fieldAutocompleteComboBox-optionsList"]`)
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', () => {
    const wrapper = mount(
      <FieldComponent
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper
        .find(`[data-test-subj="comboBoxInput"]`)
        .hasClass('euiComboBox__inputWrap-isClearable')
    ).toBeTruthy();
  });

  test('it correctly displays selected field', () => {
    const wrapper = mount(
      <FieldComponent
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
        selectedField={getField('machine.os.raw')}
      />
    );

    expect(
      wrapper.find(`[data-test-subj="fieldAutocompleteComboBox"] EuiComboBoxPill`).at(0).text()
    ).toEqual('machine.os.raw');
  });

  test('it invokes "onChange" when option selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <FieldComponent
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );

    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        aggregatable: true,
        count: 0,
        esTypes: ['text'],
        name: 'machine.os',
        readFromDocValues: false,
        scripted: false,
        searchable: true,
        type: 'string',
      },
    ]);
  });
});
