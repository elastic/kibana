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
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { monaco } from '@kbn/monaco';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { ControlTriggerSource, ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { ESQLControlsFlyout } from '.';
import { ESQLEditorTelemetryService } from '@kbn/esql-editor';

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumnsRaw: jest.fn().mockResolvedValue([{ name: 'column1' }, { name: 'column2' }]),
  getValuesFromQueryField: jest.fn().mockReturnValue('field'),
}));

const core = coreMock.createStart();
const defaultProps = {
  initialVariableType: ESQLVariableType.FIELDS,
  queryString: 'FROM foo | WHERE field ==',
  onSaveControl: jest.fn(),
  closeFlyout: jest.fn(),
  onCancelControl: jest.fn(),
  search: dataPluginMock.createStartContract().search.search,
  cursorPosition: { column: 19, lineNumber: 1 } as monaco.Position,
  esqlVariables: [],
  ariaLabelledBy: 'esqlControlFlyoutTitle',
  telemetryTriggerSource: ControlTriggerSource.QUESTION_MARK,
  telemetryService: new ESQLEditorTelemetryService(core.analytics),
};

const services = {
  core: coreMock.createStart(),
};

describe('IdentifierControlForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Field type', () => {
    it('should default correctly if no initial state is given', async () => {
      const { findByTestId, findByTitle } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout {...defaultProps} />
          </KibanaContextProvider>
        </IntlProvider>
      );
      // control type dropdown should be rendered and default to 'STATIC_VALUES'
      // no need to test further as the control type is disabled
      expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
      const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
      expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);

      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('??field');

      // fields dropdown should be rendered with available fields column1 and column2
      const fieldsOptionsDropdown = await findByTestId('esqlIdentifiersOptions');
      expect(fieldsOptionsDropdown).toBeInTheDocument();
      const fieldsOptionsDropdownSearchInput = within(fieldsOptionsDropdown).getByRole('combobox');
      fireEvent.click(fieldsOptionsDropdownSearchInput);
      expect(fieldsOptionsDropdownSearchInput).toHaveValue('');
      expect(await findByTitle('column1')).toBeDefined();
      expect(await findByTitle('column2')).toBeDefined();

      // variable label input should be rendered and with the default value (empty)
      expect(await findByTestId('esqlControlLabel')).toHaveValue('');
    });

    it('should be able to change in value type', async () => {
      const { findByTestId } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout {...defaultProps} queryString="FROM foo | STATS BY" />
          </KibanaContextProvider>
        </IntlProvider>
      );
      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('??field');
      // change the variable name to ?value
      const variableNameInput = await findByTestId('esqlVariableName');
      fireEvent.change(variableNameInput, { target: { value: '?value' } });

      expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
      const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
      expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);
      // values dropdown should be rendered
      const valuesOptionsDropdown = await findByTestId('esqlValuesOptions');
      expect(valuesOptionsDropdown).toBeInTheDocument();
    });

    it('should call the onCreateControl callback, if no initialState is given', async () => {
      const onCreateControlSpy = jest.fn();
      const { findByTestId, findByTitle } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout
              {...defaultProps}
              queryString="FROM foo | STATS BY"
              onSaveControl={onCreateControlSpy}
            />
          </KibanaContextProvider>
        </IntlProvider>
      );

      // select the first field
      const fieldsOptionsDropdownSearchInput = within(
        await findByTestId('esqlIdentifiersOptions')
      ).getByRole('combobox');
      fireEvent.click(fieldsOptionsDropdownSearchInput);
      fireEvent.click(await findByTitle('column1'));
      // click on the create button
      fireEvent.click(await findByTestId('saveEsqlControlsFlyoutButton'));
      expect(onCreateControlSpy).toHaveBeenCalled();
    });

    it('should call the onCancelControl callback, if Cancel button is clicked', async () => {
      const onCancelControlSpy = jest.fn();
      const { findByTestId } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout
              {...defaultProps}
              queryString="FROM foo | STATS BY"
              onCancelControl={onCancelControlSpy}
            />
          </KibanaContextProvider>
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
        available_options: ['column2'],
        selected_options: ['column2'],
        variable_name: 'myField',
        variable_type: ESQLVariableType.FIELDS,
        esql_query: 'FROM foo | STATS BY',
        control_type: EsqlControlType.STATIC_VALUES,
      } as OptionsListESQLControlState;
      const { findByTestId } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout {...defaultProps} initialState={initialState} />
          </KibanaContextProvider>
        </IntlProvider>
      );
      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('??myField');

      // fields dropdown should be rendered with column2 selected
      const fieldsOptionsDropdown = await findByTestId('esqlIdentifiersOptions');
      const fieldsOptionsDropdownBadge = within(fieldsOptionsDropdown).getByTestId('column2');
      expect(fieldsOptionsDropdownBadge).toBeInTheDocument();

      // variable label input should be rendered and with the default value (my control)
      expect(await findByTestId('esqlControlLabel')).toHaveValue('my control');
    });

    it('should call the onEditControl callback, if initialState is given', async () => {
      const initialState = {
        grow: true,
        width: 'small',
        title: 'my control',
        available_options: ['column2'],
        selected_options: ['column2'],
        variable_name: 'myField',
        variable_type: ESQLVariableType.FIELDS,
        esql_query: 'FROM foo | STATS BY',
        control_type: EsqlControlType.STATIC_VALUES,
      } as OptionsListESQLControlState;
      const onEditControlSpy = jest.fn();
      const { findByTestId, findByTitle } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout
              {...defaultProps}
              queryString="FROM foo | STATS BY"
              onSaveControl={onEditControlSpy}
              initialState={initialState}
            />
          </KibanaContextProvider>
        </IntlProvider>
      );

      // select the first field
      const fieldsOptionsDropdownSearchInput = within(
        await findByTestId('esqlIdentifiersOptions')
      ).getByRole('combobox');
      fireEvent.click(fieldsOptionsDropdownSearchInput);
      fireEvent.click(await findByTitle('column1'));
      // click on the create button
      fireEvent.click(await findByTestId('saveEsqlControlsFlyoutButton'));
      expect(onEditControlSpy).toHaveBeenCalled();
    });
  });

  describe('Functions type', () => {
    it('should default correctly if no initial state is given', async () => {
      const { findByTestId, findByTitle } = render(
        <IntlProvider locale="en">
          <KibanaContextProvider services={services}>
            <ESQLControlsFlyout
              {...defaultProps}
              initialVariableType={ESQLVariableType.FUNCTIONS}
              queryString="FROM foo | STATS "
              cursorPosition={{ column: 17, lineNumber: 1 } as monaco.Position}
            />
          </KibanaContextProvider>
        </IntlProvider>
      );
      // control type dropdown should be rendered and default to 'STATIC_VALUES'
      expect(await findByTestId('esqlControlTypeDropdown')).toBeInTheDocument();
      const controlTypeInputPopover = await findByTestId('esqlControlTypeInputPopover');
      expect(within(controlTypeInputPopover).getByRole('combobox')).toHaveValue(`Static values`);

      // variable name input should be rendered and with the default value
      expect(await findByTestId('esqlVariableName')).toHaveValue('??function');

      // fields dropdown should be rendered with available functions
      const fieldsOptionsDropdown = await findByTestId('esqlIdentifiersOptions');
      expect(fieldsOptionsDropdown).toBeInTheDocument();
      const fieldsOptionsDropdownSearchInput = within(fieldsOptionsDropdown).getByRole('combobox');
      fireEvent.click(fieldsOptionsDropdownSearchInput);
      expect(await findByTitle('avg')).toBeDefined();
      expect(await findByTitle('last')).toBeDefined();
    });
  });
});
