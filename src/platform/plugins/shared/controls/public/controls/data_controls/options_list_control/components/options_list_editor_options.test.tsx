/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DefaultDataControlState } from '../../../../../common';
import type { OptionsListControlState } from '../../../../../common/options_list';
import type { ControlGroupApi } from '../../../../control_group/types';
import { getMockedControlGroupApi } from '../../../mocks/control_mocks';
import type { CustomOptionsComponentProps } from '../../types';
import { OptionsListEditorOptions } from './options_list_editor_options';

describe('Options list sorting button', () => {
  const getMockedState = <State extends DefaultDataControlState = DefaultDataControlState>(
    overwrite?: Partial<OptionsListControlState>
  ): State => {
    return {
      dataViewId: 'testDataViewId',
      fieldName: 'fieldName',
      ...overwrite,
    } as State;
  };

  const updateState = jest.fn();
  const mountComponent = ({
    initialState,
    field,
    controlGroupApi = getMockedControlGroupApi(),
  }: Pick<CustomOptionsComponentProps, 'initialState' | 'field'> & {
    controlGroupApi?: ControlGroupApi;
  }) => {
    const component = render(
      <OptionsListEditorOptions
        initialState={initialState}
        field={field}
        updateState={updateState}
        setControlEditorValid={jest.fn()}
        controlGroupApi={controlGroupApi}
      />
    );
    return component;
  };

  describe('run past timeout', () => {
    test('can toggle the setting', async () => {
      const component = mountComponent({
        initialState: getMockedState({ runPastTimeout: false }),
        field: { type: 'string' } as DataViewField,
      });
      const toggle = component.getByTestId('optionsListControl__runPastTimeoutAdditionalSetting');
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      await userEvent.click(toggle);
      expect(updateState).toBeCalledWith({ runPastTimeout: true });
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    test('setting is persisted', async () => {
      const component = mountComponent({
        initialState: getMockedState({ runPastTimeout: true }),
        field: { type: 'string' } as DataViewField,
      });
      const toggle = component.getByTestId('optionsListControl__runPastTimeoutAdditionalSetting');
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });
  });

  test('selection options', async () => {
    const component = mountComponent({
      initialState: getMockedState({ singleSelect: true }),
      field: { type: 'string' } as DataViewField,
    });

    const multiSelect = component.container.querySelector('input#multi');
    expect(multiSelect).not.toBeChecked();
    expect(component.container.querySelector('input#single')).toBeChecked();

    await userEvent.click(multiSelect!);
    expect(updateState).toBeCalledWith({ singleSelect: false });
    expect(multiSelect).toBeChecked();
    expect(component.container.querySelector('input#single')).not.toBeChecked();
  });

  describe('custom search options', () => {
    test('do not show custom search options when `allowExpensiveQueries` is false', async () => {
      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(false);
      const controlGroupApi = getMockedControlGroupApi(undefined, { allowExpensiveQueries$ });
      const component = mountComponent({
        initialState: getMockedState(),
        field: { type: 'string' } as DataViewField,
        controlGroupApi,
      });
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).not.toBeInTheDocument();

      act(() => allowExpensiveQueries$.next(true));
      expect(
        component.queryByTestId('optionsListControl__searchOptionsRadioGroup')
      ).toBeInTheDocument();
    });

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
        const initialState = getMockedState({ searchTechnique: 'exact' });
        const controlGroupApi = getMockedControlGroupApi();
        const component = render(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'string' } as DataViewField}
            updateState={updateState}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        /** loads initial state properly */
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(component.container.querySelector('input#exact')).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).not.toBeChecked();

        /** responds to the field type changing */
        component.rerender(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'ip' } as DataViewField} // initial search technique IS valid
            updateState={jest.fn()}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        expect(updateState).toBeCalledWith({ searchTechnique: 'exact' });
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(component.container.querySelector('input#exact')).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).toBeNull();
      });

      test('if the current selection is valid, send that to the parent editor state', async () => {
        const initialState = getMockedState();
        const controlGroupApi = getMockedControlGroupApi();
        const component = render(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'string' } as DataViewField}
            updateState={updateState}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        /** loads default compatible search technique properly */
        expect(component.container.querySelector('input#prefix')).toBeChecked();
        expect(component.container.querySelector('input#exact')).not.toBeChecked();
        expect(component.container.querySelector('input#wildcard')).not.toBeChecked();

        /** responds to change in search technique */
        const exactSearch = component.container.querySelector('input#exact');
        await userEvent.click(exactSearch!);
        expect(updateState).toBeCalledWith({ searchTechnique: 'exact' });
        expect(component.container.querySelector('input#prefix')).not.toBeChecked();
        expect(exactSearch).toBeChecked();
        expect(component.container.querySelector('input#wildcard')).not.toBeChecked();

        /** responds to the field type changing */
        component.rerender(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'number' } as DataViewField} // current selected search technique IS valid, initial state is not
            updateState={jest.fn()}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        expect(updateState).toBeCalledWith({ searchTechnique: 'exact' });
      });

      test('if neither the initial or current search technique is valid, revert to the default', async () => {
        const initialState = getMockedState({ searchTechnique: 'wildcard' });
        const controlGroupApi = getMockedControlGroupApi();
        const component = render(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'string' } as DataViewField}
            updateState={updateState}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        /** responds to change in search technique */
        const prefixSearch = component.container.querySelector('input#prefix');
        await userEvent.click(prefixSearch!);
        expect(updateState).toBeCalledWith({ searchTechnique: 'prefix' });

        /** responds to the field type changing */
        component.rerender(
          <OptionsListEditorOptions
            initialState={initialState}
            field={{ type: 'number' } as DataViewField} // neither initial nor current search technique is valid
            updateState={jest.fn()}
            setControlEditorValid={jest.fn()}
            controlGroupApi={controlGroupApi}
          />
        );

        expect(updateState).toBeCalledWith({ searchTechnique: 'exact' });
      });
    });
  });
});
