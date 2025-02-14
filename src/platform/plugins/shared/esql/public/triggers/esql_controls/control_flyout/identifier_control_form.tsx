/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
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
import {
  ESQLVariableType,
  ESQLControlVariable,
  aggregationFunctionDefinitions,
} from '@kbn/esql-validation-autocomplete';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import type { ESQLControlState, ControlWidthOptions } from '../types';
import {
  Header,
  Footer,
  ControlWidth,
  ControlType,
  VariableName,
  ControlLabel,
} from './shared_form_components';
import {
  getRecurrentVariableName,
  getFlyoutStyling,
  getQueryForFields,
  validateVariableName,
  getVariablePrefix,
} from './helpers';
import { EsqlControlType } from '../types';

interface IdentifierControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  queryString: string;
  esqlVariables: ESQLControlVariable[];
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string) => void;
  onEditControl: (state: ESQLControlState) => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  onCancelControl?: () => void;
}

export function IdentifierControlForm({
  variableType,
  initialState,
  queryString,
  esqlVariables,
  cursorPosition,
  onCreateControl,
  onEditControl,
  onCancelControl,
  search,
  closeFlyout,
}: IdentifierControlFormProps) {
  const isMounted = useMountedState();
  const suggestedVariableName = useMemo(() => {
    const existingVariables = new Set(
      esqlVariables
        .filter((variable) => variable.type === variableType)
        .map((variable) => variable.key)
    );

    if (initialState) {
      return initialState.variableName;
    }

    const variablePrefix = getVariablePrefix(variableType);
    return getRecurrentVariableName(variablePrefix, existingVariables);
  }, [esqlVariables, initialState, variableType]);

  const [availableIdentifiersOptions, setAvailableIdentifiersOptions] = useState<
    EuiComboBoxOptionOption[]
  >([]);

  const [selectedIdentifiers, setSelectedIdentifiers] = useState<EuiComboBoxOptionOption[]>(
    initialState
      ? initialState.availableOptions.map((option) => {
          return {
            label: option,
            key: option,
            'data-test-subj': option,
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

  useEffect(
    function initAvailableIdentifiersOptions() {
      if (availableIdentifiersOptions.length > 0) return;
      if (variableType === ESQLVariableType.FIELDS) {
        const queryForFields = getQueryForFields(queryString, cursorPosition);
        getESQLQueryColumnsRaw({
          esqlQuery: queryForFields,
          search,
        }).then((columns) => {
          if (isMounted()) {
            setAvailableIdentifiersOptions(
              columns.map((col) => {
                return {
                  label: col.name,
                  key: col.name,
                  'data-test-subj': col.name,
                };
              })
            );
          }
        });
      }
      if (variableType === ESQLVariableType.FUNCTIONS) {
        const aggregatedFunctions = aggregationFunctionDefinitions.map((func) => {
          return {
            label: func.name,
            key: func.name,
            'data-test-subj': func.name,
          };
        });
        setAvailableIdentifiersOptions(aggregatedFunctions);
      }
    },
    [
      availableIdentifiersOptions.length,
      cursorPosition,
      isMounted,
      queryString,
      search,
      variableType,
    ]
  );

  useEffect(() => {
    const variableExists =
      esqlVariables.some((variable) => variable.key === variableName.replace('?', '')) &&
      !isControlInEditMode;

    setFormIsInvalid(!selectedIdentifiers.length || !variableName || variableExists);
  }, [esqlVariables, isControlInEditMode, selectedIdentifiers.length, variableName]);

  const onIdentifiersChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedIdentifiers(selectedOptions);
  }, []);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      const text = validateVariableName(String(e.target.value));
      setVariableName(text);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    if (optionId) {
      setMinimumWidth(optionId as ControlWidthOptions);
    }
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
        label: searchValue,
        key: searchValue,
        'data-test-subj': searchValue,
      };

      if (
        flattenedOptions.findIndex(
          (option) => option.label.trim().toLowerCase() === normalizedSearchValue
        ) === -1
      ) {
        setAvailableIdentifiersOptions((prev) => [...prev, newOption]);
      }

      setSelectedIdentifiers((prevSelected) => [...prevSelected, newOption]);
    },
    []
  );

  const onCreateFieldControl = useCallback(async () => {
    const availableOptions = selectedIdentifiers.map((field) => field.label);
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
        await onCreateControl(state, variableName);
      } else {
        onEditControl(state);
      }
    }
    closeFlyout();
  }, [
    selectedIdentifiers,
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
          esqlVariables={esqlVariables}
        />

        <EuiFormRow
          label={i18n.translate('esql.flyout.values.label', {
            defaultMessage: 'Values',
          })}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select or add values',
            })}
            placeholder={i18n.translate('esql.flyout.fieldsOptions.placeholder', {
              defaultMessage: 'Select or add values',
            })}
            options={availableIdentifiersOptions}
            selectedOptions={selectedIdentifiers}
            onChange={onIdentifiersChange}
            onCreateOption={onCreateOption}
            data-test-subj="esqlIdentifiersOptions"
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
        onCancelControl={onCancelControl}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateFieldControl}
      />
    </>
  );
}
