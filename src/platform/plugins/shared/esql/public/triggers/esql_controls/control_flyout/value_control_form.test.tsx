/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { IUiSettingsClient } from '@kbn/core/public';
import { monaco } from '@kbn/monaco';
import { coreMock } from '@kbn/core/server/mocks';
import { ESQLVariableType, EsqlControlType, ESQLControlState } from '@kbn/esql-types';
import { getESQLResults } from '@kbn/esql-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ESQLControlsFlyout } from '.';

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
    getESQLQueryColumnsRaw: jest.fn().mockResolvedValue([{ name: 'column1' }, { name: 'column2' }]),
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
        <IntlProvider locale="en">
          <ESQLControlsFlyout
            initialVariableType={ESQLVariableType.TIME_LITERAL}
            queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
            onSaveControl={jest.fn()}
            closeFlyout={jest.fn()}
            onCancelControl={jest.fn()}
            search={searchMock}
            esqlVariables={[]}
          />
        </IntlProvider>
      );
      // control type dropdown should be rendered and default to 'STATIC_VALUES'
      expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
      const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
      expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);

      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('?interval');

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
        <IntlProvider locale="en">
          <ESQLControlsFlyout
            initialVariableType={ESQLVariableType.TIME_LITERAL}
            queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
            onSaveControl={onCreateControlSpy}
            closeFlyout={jest.fn()}
            onCancelControl={jest.fn()}
            search={searchMock}
            esqlVariables={[]}
            cursorPosition={{ lineNumber: 1, column: 1 } as monaco.Position}
          />
        </IntlProvider>
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
        <IntlProvider locale="en">
          <ESQLControlsFlyout
            initialVariableType={ESQLVariableType.TIME_LITERAL}
            queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
            onSaveControl={jest.fn()}
            closeFlyout={jest.fn()}
            onCancelControl={onCancelControlSpy}
            search={searchMock}
            esqlVariables={[]}
          />
        </IntlProvider>
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
        <IntlProvider locale="en">
          <ESQLControlsFlyout
            initialVariableType={ESQLVariableType.TIME_LITERAL}
            queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
            onSaveControl={jest.fn()}
            closeFlyout={jest.fn()}
            onCancelControl={jest.fn()}
            search={searchMock}
            initialState={initialState}
            esqlVariables={[]}
          />
        </IntlProvider>
      );
      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('?myInterval');

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
        <IntlProvider locale="en">
          <ESQLControlsFlyout
            initialVariableType={ESQLVariableType.TIME_LITERAL}
            queryString="FROM foo | STATS BY BUCKET(@timestamp,)"
            onSaveControl={onEditControlSpy}
            closeFlyout={jest.fn()}
            onCancelControl={jest.fn()}
            search={searchMock}
            initialState={initialState}
            esqlVariables={[]}
            cursorPosition={{ lineNumber: 1, column: 1 } as monaco.Position}
          />
        </IntlProvider>
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
              <ESQLControlsFlyout
                initialVariableType={ESQLVariableType.VALUES}
                queryString="FROM foo | WHERE field =="
                onSaveControl={jest.fn()}
                closeFlyout={jest.fn()}
                onCancelControl={jest.fn()}
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

      it('should be able to change in fields type', async () => {
        const { findByTestId } = render(
          <IntlProvider locale="en">
            <ESQLControlsFlyout
              initialVariableType={ESQLVariableType.VALUES}
              queryString="FROM foo | WHERE field =="
              onSaveControl={jest.fn()}
              closeFlyout={jest.fn()}
              onCancelControl={jest.fn()}
              search={searchMock}
              esqlVariables={[]}
            />
          </IntlProvider>
        );
        // variable name input should be rendered and with the default value
        expect(await findByTestId('esqlVariableName')).toHaveValue('?field');
        // change the variable name to ?value
        const variableNameInput = await findByTestId('esqlVariableName');
        fireEvent.change(variableNameInput, { target: { value: '??field' } });

        expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
        const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
        expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);
        // identifiers dropdown should be rendered
        const identifiersOptionsDropdown = await findByTestId('esqlIdentifiersOptions');
        expect(identifiersOptionsDropdown).toBeInTheDocument();
      });

      it('should call getESQLResults with the provided timeRange when query is submitted', async () => {
        const mockTimeRange = { from: '2023-01-01', to: '2023-01-02' };

        render(
          <IntlProvider locale="en">
            <ESQLControlsFlyout
              initialVariableType={ESQLVariableType.VALUES}
              queryString="FROM foo | WHERE field =="
              onSaveControl={jest.fn()}
              closeFlyout={jest.fn()}
              onCancelControl={jest.fn()}
              search={searchMock}
              esqlVariables={[]}
              timeRange={mockTimeRange}
            />
          </IntlProvider>
        );

        await waitFor(() => {
          expect(getESQLResults).toHaveBeenCalledWith(
            expect.objectContaining({
              timeRange: mockTimeRange,
            })
          );
        });
      });
    });
  });
});
