/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OptionsListControlState } from '@kbn/controls-schemas';

import type { CustomOptionsComponentProps } from '../../types';
import { OptionsListEditorOptions } from './options_list_editor_options';
import { OptionsListControlContext } from '../options_list_context_provider';
import type { OptionsListComponentApi } from '../types';
import { getOptionsListContextMock } from '../../mocks/api_mocks';

describe('Options list sorting button', () => {
  const getMockedState = <State extends OptionsListControlState = OptionsListControlState>(
    overwrite?: Partial<OptionsListControlState>
  ): State => {
    return {
      data_view_id: 'testDataViewId',
      field_name: 'fieldName',
      ...overwrite,
    } as State;
  };

  const updateState = jest.fn();

  const mountComponent = ({
    initialState,
    field,
    componentApi = {},
  }: Pick<CustomOptionsComponentProps, 'initialState' | 'field'> & {
    componentApi?: Partial<OptionsListComponentApi>;
  }) => {
    const { componentApi: mockComponentApiBase, displaySettings } = getOptionsListContextMock();
    const component = render(
      <OptionsListControlContext.Provider
        value={{
          componentApi: { ...mockComponentApiBase, ...componentApi },
          displaySettings,
        }}
      >
        <OptionsListEditorOptions
          initialState={initialState}
          field={field}
          updateState={updateState}
          setControlEditorValid={jest.fn()}
        />
      </OptionsListControlContext.Provider>
    );
    return component;
  };

  describe('run past timeout', () => {
    test('can toggle the setting', async () => {
      const component = mountComponent({
        initialState: getMockedState({ run_past_timeout: false }),
        field: { type: 'string' } as DataViewField,
      });
      const toggle = component.getByTestId('optionsListControl__runPastTimeoutAdditionalSetting');
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      await userEvent.click(toggle);
      expect(updateState).toBeCalledWith({ run_past_timeout: true });
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    test('setting is persisted', async () => {
      const component = mountComponent({
        initialState: getMockedState({ run_past_timeout: true }),
        field: { type: 'string' } as DataViewField,
      });
      const toggle = component.getByTestId('optionsListControl__runPastTimeoutAdditionalSetting');
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  test('selection options', async () => {
    const component = mountComponent({
      initialState: getMockedState({ single_select: true }),
      field: { type: 'string' } as DataViewField,
    });

    const multiSelect = component.container.querySelector('input#multi');
    expect(multiSelect).not.toBeChecked();
    expect(component.container.querySelector('input#single')).toBeChecked();

    await userEvent.click(multiSelect!);
    expect(updateState).toBeCalledWith({ single_select: false });
    expect(multiSelect).toBeChecked();
    expect(component.container.querySelector('input#single')).not.toBeChecked();
  });

  describe('custom search options', () => {
    test('string field has three custom search options', async () => {
      const component = mountComponent({
        initialState: getMockedState(),
        field: { type: 'string' } as DataViewField,
      });
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).toBeInTheDocument();
      const validTechniques = ['prefix', 'exact', 'wildcard'];
      validTechniques.forEach((technique) => {
        expect(
          component.queryByTestId(`optionsListControl__${technique}SearchOptionAdditionalSetting`)
        ).toBeInTheDocument();
      });
    });

    test('IP field has two custom search options', async () => {
      const component = mountComponent({
        initialState: getMockedState(),
        field: { type: 'ip' } as DataViewField,
      });
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).toBeInTheDocument();
      const validTechniques = ['prefix', 'exact'];
      validTechniques.forEach((technique) => {
        expect(
          component.queryByTestId(`optionsListControl__${technique}SearchOptionAdditionalSetting`)
        ).toBeInTheDocument();
      });
    });

    test('number field does not have custom search options', async () => {
      const component = mountComponent({
        initialState: getMockedState(),
        field: { type: 'number' } as DataViewField,
      });
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).not.toBeInTheDocument();
    });

    test('date field does not have custom search options', async () => {
      const component = mountComponent({
        initialState: getMockedState(),
        field: { type: 'date' } as DataViewField,
      });
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).not.toBeInTheDocument();
    });

    describe('responds to field type changing', () => {
      test('reset back to initial state when valid', async () => {
        const initialState = getMockedState({ search_technique: 'exact' });
        const component = render(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'string' } as DataViewField}
              updateState={updateState}
              setControlEditorValid={jest.fn()}
            />
          </OptionsListControlContext.Provider>
        );

        /** loads initial state properly */
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(component.container.querySelector('input#exact')).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).not.toBeChecked();

        /** responds to the field type changing */
        component.rerender(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'ip' } as DataViewField} // initial search technique IS valid
              updateState={jest.fn()}
              setControlEditorValid={jest.fn()}
            />
          </OptionsListControlContext.Provider>
        );

        expect(updateState).toBeCalledWith({ search_technique: 'exact' });
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(component.container.querySelector('input#exact')).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).toBeNull();
      });

      test('if the current selection is valid, send that to the parent editor state', async () => {
        const initialState = getMockedState();
        const component = render(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'string' } as DataViewField}
              updateState={updateState}
              setControlEditorValid={jest.fn()}
            />{' '}
          </OptionsListControlContext.Provider>
        );

        /** loads default compatible search technique properly */
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(component.container.querySelector('input#exact')).not.toBeChecked();
        expect(component.container.querySelector('input#wildcard')).toBeChecked();

        /** responds to change in search technique */
        const exactSearch = component.container.querySelector('input#exact');
        await userEvent.click(exactSearch!);
        expect(updateState).toBeCalledWith({ search_technique: 'exact' });
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(exactSearch).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).not.toBeChecked();

        /** responds to the field type changing */
        component.rerender(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'number' } as DataViewField} // current selected search technique IS valid, initial state is not
              updateState={jest.fn()}
              setControlEditorValid={jest.fn()}
            />
          </OptionsListControlContext.Provider>
        );

        expect(updateState).toBeCalledWith({ search_technique: 'exact' });
      });

      test('if neither the initial or current search technique is valid, revert to the default', async () => {
        const initialState = getMockedState({ search_technique: 'wildcard' });
        const component = render(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'string' } as DataViewField}
              updateState={updateState}
              setControlEditorValid={jest.fn()}
            />
          </OptionsListControlContext.Provider>
        );

        /** responds to change in search technique */
        const prefixSearch = component.container.querySelector('input#prefix');
        await userEvent.click(prefixSearch!);
        expect(updateState).toBeCalledWith({ search_technique: 'prefix' });

        /** responds to the field type changing */
        component.rerender(
          <OptionsListControlContext.Provider value={getOptionsListContextMock()}>
            <OptionsListEditorOptions
              initialState={initialState}
              field={{ type: 'number' } as DataViewField} // neither initial nor current search technique is valid
              updateState={jest.fn()}
              setControlEditorValid={jest.fn()}
            />
          </OptionsListControlContext.Provider>
        );

        expect(updateState).toBeCalledWith({ search_technique: 'exact' });
      });
    });
  });
});
