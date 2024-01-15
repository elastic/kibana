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
import { waitFor } from '@testing-library/react';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getField } from '../fields/index.mock';
import { AutocompleteFieldListsComponent } from '.';
import {
  getListResponseMock,
  getFoundListsBySizeSchemaMock,
  DATE_NOW,
  IMMUTABLE,
  VERSION,
} from '../list_schema/index.mock';

// TODO: Once these mocks are available, use them instead of hand mocking, https://github.com/elastic/kibana/issues/100715
// const mockKibanaHttpService = coreMock.createStart().http;
// import { coreMock } from '../../../../../../../src/core/public/mocks';
const mockKibanaHttpService = jest.fn();

const mockStart = jest.fn();
const mockKeywordList: ListSchema = {
  ...getListResponseMock(),
  id: 'keyword_list',
  name: 'keyword list',
  type: 'keyword',
};
const mockResult = { ...getFoundListsBySizeSchemaMock() };
mockResult.smallLists = [...mockResult.smallLists, mockKeywordList];
mockResult.largeLists = [];
jest.mock('@kbn/securitysolution-list-hooks', () => {
  const originalModule = jest.requireActual('@kbn/securitysolution-list-hooks');

  return {
    ...originalModule,
    useFindListsBySize: () => ({
      error: undefined,
      loading: false,
      result: mockResult,
      start: mockStart.mockReturnValue(mockResult),
    }),
  };
});

describe('AutocompleteFieldListsComponent', () => {
  test('it renders disabled if "isDisabled" is true', async () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={true}
        isDisabled
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="some-list-id"
      />
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] input`)
        .prop('disabled')
    ).toBeTruthy();
  });

  test('it renders loading if "isLoading" is true', async () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('@tags')}
        selectedValue=""
      />
    );

    wrapper
      .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] button`)
      .at(0)
      .simulate('click');
    expect(
      wrapper
        .find(
          `EuiComboBoxOptionsList[data-test-subj="valuesAutocompleteComboBox listsComboxBox-optionsList"]`
        )
        .prop('isLoading')
    ).toBeTruthy();
  });

  test('it allows user to clear values if "isClearable" is true', async () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue=""
      />
    );
    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'some name', disabled: false }]);
  });

  test('it correctly displays lists that match the selected "keyword" field esType', () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('@tags')}
        selectedValue=""
      />
    );

    wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');

    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'keyword list', disabled: false }]);
  });

  test('it correctly displays lists that match the selected "ip" field esType', () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue=""
      />
    );

    wrapper.find('[data-test-subj="comboBoxToggleListButton"] button').simulate('click');

    expect(
      wrapper
        .find('EuiComboBox[data-test-subj="valuesAutocompleteComboBox listsComboxBox"]')
        .prop('options')
    ).toEqual([{ label: 'some name', disabled: false }]);
  });

  test('it correctly displays selected list', async () => {
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue="some-list-id"
      />
    );

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox listsComboxBox"] input`)
        .at(0)
        .props().value
    ).toEqual('some name');
  });

  test('it invokes "onChange" when option selected', async () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <AutocompleteFieldListsComponent
        httpService={mockKibanaHttpService}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        placeholder="Placeholder text"
        selectedField={getField('ip')}
        selectedValue=""
      />
    );

    (
      wrapper.find(EuiComboBox).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'some name', disabled: false }]);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        '@timestamp': DATE_NOW,
        _version: undefined,
        created_at: DATE_NOW,
        created_by: 'some user',
        description: 'some description',
        deserializer: undefined,
        id: 'some-list-id',
        immutable: IMMUTABLE,
        meta: {},
        name: 'some name',
        serializer: undefined,
        tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
        type: 'ip',
        updated_at: DATE_NOW,
        updated_by: 'some user',
        version: VERSION,
      });
    });
  });
});
