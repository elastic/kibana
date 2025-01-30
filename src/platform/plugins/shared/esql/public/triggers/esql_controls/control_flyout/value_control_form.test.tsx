/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { IUiSettingsClient } from '@kbn/core/public';
import { coreMock } from '@kbn/core/server/mocks';
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ValueControlForm } from './value_control_form';
import { EsqlControlType, ESQLControlState } from '../types';

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLResults: jest.fn().mockResolvedValue({
      response: {
        columns: [
          {
            name: 'field',
            id: 'field',
            meta: {
              type: 'keyword',
            },
          },
        ],
        values: [],
      },
    }),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('index1'),
    getLimitFromESQLQuery: jest.fn().mockReturnValue(1000),
    isQueryWrappedByPipes: jest.fn().mockReturnValue(false),
    getValuesFromQueryField: jest.fn().mockReturnValue('field'),
  };
});

describe('ValueControlForm', () => {
  const dataMock = dataPluginMock.createStartContract();
  const searchMock = dataMock.search.search;

  const uiConfig: Record<string, any> = {};
  const uiSettings = {
    get: (key: string) => uiConfig[key],
  } as IUiSettingsClient;

  const services = {
    uiSettings,
    settings: {
      client: uiSettings,
    },
    core: coreMock.createStart(),
    data: dataMock,
  };

  describe('Interval type', () => {
    it('should default correctly if no initial state is given for an interval variable type', async () => {
      const { findByTestId, findByTitle } = render(
        <ValueControlForm
          variableType={ESQLVariableType.TIME_LITERAL}
          queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
          onCreateControl={jest.fn()}
          closeFlyout={jest.fn()}
          onEditControl={jest.fn()}
          search={searchMock}
          esqlVariables={[]}
        />
      );
      // control type dropdown should be rendered and default to 'STATIC_VALUES'
      expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
      const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
      expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);

      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('interval');

      // values dropdown should be rendered
      const valuesOptionsDropdown = await findByTestId('esqlValuesOptions');
      expect(valuesOptionsDropdown).toBeInTheDocument();
      const valuesOptionsDropdownSearchInput = within(valuesOptionsDropdown).getByRole('combobox');
      fireEvent.click(valuesOptionsDropdownSearchInput);
      expect(valuesOptionsDropdownSearchInput).toHaveValue('');
      expect(await findByTitle('5 minutes')).toBeDefined();
      expect(await findByTitle('1 hour')).toBeDefined();

      // variable label input should be rendered and with the default value (empty)
      expect(await findByTestId('esqlControlLabel')).toHaveValue('');

      // control width dropdown should be rendered and default to 'MEDIUM'
      expect(await findByTestId('esqlControlMinimumWidth')).toBeInTheDocument();
      const pressedWidth = within(await findByTestId('esqlControlMinimumWidth')).getByTitle(
        'Medium'
      );
      expect(pressedWidth).toHaveAttribute('aria-pressed', 'true');

      // control grow switch should be rendered and default to 'false'
      expect(await findByTestId('esqlControlGrow')).toBeInTheDocument();
      const growSwitch = await findByTestId('esqlControlGrow');
      expect(growSwitch).not.toBeChecked();
    });

    it('should call the onCreateControl callback, if no initialState is given', async () => {
      const onCreateControlSpy = jest.fn();
      const { findByTestId, findByTitle } = render(
        <ValueControlForm
          variableType={ESQLVariableType.TIME_LITERAL}
          queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
          onCreateControl={onCreateControlSpy}
          closeFlyout={jest.fn()}
          onEditControl={jest.fn()}
          search={searchMock}
          esqlVariables={[]}
        />
      );

      // select the first interval
      const valuesOptionsDropdownSearchInput = within(
        await findByTestId('esqlValuesOptions')
      ).getByRole('combobox');
      fireEvent.click(valuesOptionsDropdownSearchInput);
      fireEvent.click(await findByTitle('5 minutes'));
      // click on the create button
      fireEvent.click(await findByTestId('saveEsqlControlsFlyoutButton'));
      expect(onCreateControlSpy).toHaveBeenCalled();
    });

    it('should call the onCancelControl callback, if Cancel button is clicked', async () => {
      const onCancelControlSpy = jest.fn();
      const { findByTestId } = render(
        <ValueControlForm
          variableType={ESQLVariableType.TIME_LITERAL}
          queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
          onCreateControl={jest.fn()}
          onCancelControl={onCancelControlSpy}
          closeFlyout={jest.fn()}
          onEditControl={jest.fn()}
          search={searchMock}
          esqlVariables={[]}
        />
      );
      // click on the cancel button
      fireEvent.click(await findByTestId('cancelEsqlControlsFlyoutButton'));
      expect(onCancelControlSpy).toHaveBeenCalled();
    });

    it('should default correctly if initial state is given', async () => {
      const initialState = {
        grow: true,
        width: 'small',
        title: 'my control',
        availableOptions: ['5 minutes'],
        selectedOptions: ['5 minutes'],
        variableName: 'myInterval',
        variableType: ESQLVariableType.TIME_LITERAL,
        esqlQuery: 'FROM foo | STATS BY BUCKET(@timestamp,)"',
        controlType: EsqlControlType.STATIC_VALUES,
      } as ESQLControlState;
      const { findByTestId } = render(
        <ValueControlForm
          variableType={ESQLVariableType.TIME_LITERAL}
          queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
          onCreateControl={jest.fn()}
          closeFlyout={jest.fn()}
          onEditControl={jest.fn()}
          search={searchMock}
          initialState={initialState}
          esqlVariables={[]}
        />
      );
      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('myInterval');

      // values dropdown should be rendered with column2 selected
      const valuesOptionsDropdown = await findByTestId('esqlValuesOptions');
      const valuesOptionsDropdownBadge = within(valuesOptionsDropdown).getByTestId('5 minutes');
      expect(valuesOptionsDropdownBadge).toBeInTheDocument();

      // variable label input should be rendered and with the default value (my control)
      expect(await findByTestId('esqlControlLabel')).toHaveValue('my control');

      // control width dropdown should be rendered and default to 'MEDIUM'
      expect(await findByTestId('esqlControlMinimumWidth')).toBeInTheDocument();
      const pressedWidth = within(await findByTestId('esqlControlMinimumWidth')).getByTitle(
        'Small'
      );
      expect(pressedWidth).toHaveAttribute('aria-pressed', 'true');

      // control grow switch should be rendered and default to 'false'
      expect(await findByTestId('esqlControlGrow')).toBeInTheDocument();
      const growSwitch = await findByTestId('esqlControlGrow');
      expect(growSwitch).toBeChecked();
    });

    it('should call the onEditControl callback, if initialState is given', async () => {
      const initialState = {
        grow: true,
        width: 'small',
        title: 'my control',
        availableOptions: ['5 minutes'],
        selectedOptions: ['5 minutes'],
        variableName: 'myInterval',
        variableType: ESQLVariableType.TIME_LITERAL,
        esqlQuery: 'FROM foo | STATS BY BUCKET(@timestamp,)"',
        controlType: EsqlControlType.STATIC_VALUES,
      } as ESQLControlState;
      const onEditControlSpy = jest.fn();
      const { findByTestId } = render(
        <ValueControlForm
          variableType={ESQLVariableType.FIELDS}
          queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
          onCreateControl={jest.fn()}
          closeFlyout={jest.fn()}
          onEditControl={onEditControlSpy}
          search={searchMock}
          initialState={initialState}
          esqlVariables={[]}
        />
      );
      // click on the create button
      fireEvent.click(await findByTestId('saveEsqlControlsFlyoutButton'));
      expect(onEditControlSpy).toHaveBeenCalled();
    });

    describe('Values type', () => {
      it('should default correctly if no initial state is given for a values variable type', async () => {
        const { findByTestId } = render(
          <KibanaContextProvider services={services}>
            <IntlProvider locale="en">
              <ValueControlForm
                variableType={ESQLVariableType.VALUES}
                queryString="FROM foo | WHERE field =="
                onCreateControl={jest.fn()}
                closeFlyout={jest.fn()}
                onEditControl={jest.fn()}
                search={searchMock}
                esqlVariables={[]}
              />
            </IntlProvider>
          </KibanaContextProvider>
        );
        // control type dropdown should be rendered and default to 'Values from a query'
        expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
        const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
        expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(
          `Values from a query`
        );

        // values preview panel should be rendered
        expect(await findByTestId('esqlValuesPreview')).toBeInTheDocument();
      });
    });
  });
});
