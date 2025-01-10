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
import { monaco } from '@kbn/monaco';
import type { ISearchGeneric } from '@kbn/search-types';
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { esqlVariablesService } from '@kbn/esql-variables/common';
import type { ESQLControlState } from '../types';
import {
  Header,
  Footer,
  ControlWidth,
  ControlType,
  VariableName,
  ControlLabel,
} from './shared_form_components';
import { getRecurrentVariableName, getFlyoutStyling, getQueryForFields } from './helpers';
import { EsqlControlType } from '../types';

interface FieldControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  queryString: string;
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onEditControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  onCancelControlCb?: () => void;
}

export function FieldControlForm({
  variableType,
  initialState,
  queryString,
  cursorPosition,
  onCreateControl,
  onEditControl,
  onCancelControlCb,
  search,
  closeFlyout,
}: FieldControlFormProps) {
  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(variableType);

    return initialState
      ? `${initialState.variableName}`
      : getRecurrentVariableName(
          'field',
          existingVariables.map((variable) => variable.key)
        );
  }, [variableType, initialState]);

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
    if (!availableFieldsOptions.length) {
      const queryForFields = getQueryForFields(queryString, cursorPosition);
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
  }, [availableFieldsOptions.length, variableType, cursorPosition, queryString, search]);

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
      let text = String(e.target.value).replace('?', '');
      if (text.charAt(0) === '_') {
        text = text.substring(1);
      }
      setVariableName(text);
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
      if (!searchValue.trim()) {
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

  const onCreateFieldControl = useCallback(async () => {
    const availableOptions = selectedFields.map((field) => field.label);
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || variableName,
      variableName,
      variableType,
      controlType: EsqlControlType.STATIC_VALUES,
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
    variableType,
    queryString,
    grow,
    isControlInEditMode,
    closeFlyout,
    onCreateControl,
    onEditControl,
  ]);

  const styling = useMemo(() => getFlyoutStyling(), []);

  return (
    <>
      <Header isInEditMode={isControlInEditMode} />
      <EuiFlyoutBody
        css={css`
          ${styling}
        `}
      >
        <ControlType isDisabled initialControlFlyoutType={EsqlControlType.STATIC_VALUES} />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
        />

        <EuiFormRow
          label={i18n.translate('esql.flyout.values.label', {
            defaultMessage: 'Values',
          })}
          helpText={i18n.translate('esql.flyout.values.multipleValuesDropdownLabel', {
            defaultMessage: 'Select multiple values',
          })}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select the fields options',
            })}
            placeholder={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select the fields options',
            })}
            options={availableFieldsOptions}
            selectedOptions={selectedFields}
            onChange={onFieldsChange}
            onCreateOption={onCreateOption}
            data-test-subj="esqlFieldsOptions"
            fullWidth
            compressed
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
        onCancelControlCb={onCancelControlCb}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateFieldControl}
      />
    </>
  );
}
