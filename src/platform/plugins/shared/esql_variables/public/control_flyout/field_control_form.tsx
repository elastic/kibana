/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiFormRow,
  EuiFlyoutBody,
  type EuiSwitchEvent,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ISearchGeneric } from '@kbn/search-types';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import { getQueryForFields } from '@kbn/esql-validation-autocomplete/src/autocomplete/helper';
import { buildQueryUntilPreviousCommand } from '@kbn/esql-validation-autocomplete/src/shared/resources_helpers';
import { parse } from '@kbn/esql-ast';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { esqlVariablesService } from '../../common';
import type { ESQLControlState } from '../types';
import {
  Header,
  Footer,
  ControlWidth,
  ControlType,
  VariableName,
  ControlLabel,
} from './shared_form_components';
import { getRecurrentVariableName } from './helpers';
import { EsqlControlFlyoutType } from '../types';

interface FieldControlFormProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  dashboardApi: DashboardApi;
  queryString: string;
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onEditControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  initialState?: ESQLControlState;
}

export function FieldControlForm({
  controlType,
  initialState,
  dashboardApi,
  queryString,
  onCreateControl,
  onEditControl,
  search,
  closeFlyout,
}: FieldControlFormProps) {
  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(controlType);

    return initialState
      ? `${initialState.variableName}`
      : getRecurrentVariableName(
          'field',
          existingVariables.map((variable) => variable.key)
        );
  }, [controlType, initialState]);

  const [availableFieldsOptions, setAvailableFieldsOptions] = useState<EuiComboBoxOptionOption[]>(
    []
  );

  const [selectedFields, setSelectedFields] = useState<EuiComboBoxOptionOption[]>(
    initialState
      ? initialState.availableOptions.map((option) => {
          return {
            label: option,
            'data-test-subj': option,
            key: option,
          };
        })
      : []
  );
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  useEffect(() => {
    if (controlType === EsqlControlType.FIELDS && !availableFieldsOptions.length) {
      // get the valid query until the prev command and get the columns
      const { root } = parse(queryString);
      const queryForFields = getQueryForFields(
        buildQueryUntilPreviousCommand(root.commands, queryString),
        root.commands
      );
      getESQLQueryColumnsRaw({
        esqlQuery: queryForFields,
        search,
      }).then((columns) => {
        setAvailableFieldsOptions(
          columns.map((col) => {
            return {
              label: col.name,
              'data-test-subj': col.name,
              key: col.name,
            };
          })
        );
      });
    }
  }, [availableFieldsOptions.length, controlType, queryString, search]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    setFormIsInvalid(!selectedFields.length || !variableName || variableExists);
  }, [isControlInEditMode, selectedFields.length, variableName]);

  const onFieldsChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedFields(selectedOptions);
  }, []);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      setVariableName(e.target.value);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    setMinimumWidth(optionId);
  }, []);

  const onGrowChange = useCallback((e: EuiSwitchEvent) => {
    setGrow(e.target.checked);
  }, []);

  const onCreateOption = useCallback(
    (searchValue: string, flattenedOptions: EuiComboBoxOptionOption[] = []) => {
      if (!searchValue) {
        return;
      }

      const normalizedSearchValue = searchValue.trim().toLowerCase();

      const newOption = {
        value: searchValue,
        label: searchValue,
      };

      if (
        flattenedOptions.findIndex(
          (option) => option.label.trim().toLowerCase() === normalizedSearchValue
        ) === -1
      ) {
        setAvailableFieldsOptions([...availableFieldsOptions, newOption]);
      }

      setSelectedFields((prevSelected) => [...prevSelected, newOption]);
    },
    [availableFieldsOptions]
  );

  const onCreateIntervalControl = useCallback(async () => {
    const availableOptions = selectedFields.map((field) => field.label);
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || variableName,
      variableName,
      variableType: controlType,
      esqlQuery: queryString,
      grow,
    };

    if (availableOptions.length) {
      if (!isControlInEditMode) {
        await onCreateControl(state, variableName, availableOptions[0]);
      } else {
        onEditControl(state, variableName, availableOptions[0]);
      }
    }
    closeFlyout();
  }, [
    selectedFields,
    minimumWidth,
    label,
    variableName,
    controlType,
    queryString,
    grow,
    isControlInEditMode,
    closeFlyout,
    onCreateControl,
    onEditControl,
  ]);

  return (
    <>
      <Header />
      <EuiFlyoutBody
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          pointer-events: none;
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            overflow-y: hidden;
            transform: initial;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            block-size: 100%;
          }
        `}
      >
        <ControlType isDisabled initialControlFlyoutType={EsqlControlFlyoutType.STATIC_VALUES} />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
        />

        <EuiFormRow
          label={i18n.translate('esqlVariables.flyout.values.label', {
            defaultMessage: 'Values',
          })}
          helpText={i18n.translate('esqlVariables.flyout.values.multipleValuesDropdownLabel', {
            defaultMessage: 'Select multiple values',
          })}
          fullWidth
          isInvalid={!selectedFields.length}
          error={
            !selectedFields.length
              ? i18n.translate('esqlVariables.flyout.fieldvalues.error', {
                  defaultMessage: 'At least one field is required',
                })
              : undefined
          }
        >
          <EuiComboBox
            aria-label={i18n.translate('esqlVariables.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select the fields options',
            })}
            placeholder={i18n.translate('esqlVariables.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select the fields options',
            })}
            options={availableFieldsOptions}
            selectedOptions={selectedFields}
            onChange={onFieldsChange}
            onCreateOption={onCreateOption}
            fullWidth
          />
        </EuiFormRow>

        <ControlLabel label={label} onLabelChange={onLabelChange} />

        <ControlWidth
          minimumWidth={minimumWidth}
          grow={grow}
          onMinimumSizeChange={onMinimumSizeChange}
          onGrowChange={onGrowChange}
        />
      </EuiFlyoutBody>
      <Footer
        isControlInEditMode={isControlInEditMode}
        variableName={variableName}
        dashboardApi={dashboardApi}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateIntervalControl}
      />
    </>
  );
}
