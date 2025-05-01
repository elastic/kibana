/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  EuiComboBox,
  EuiFormRow,
  type EuiSwitchEvent,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  ESQLVariableType,
  EsqlControlType,
  type ESQLControlState,
  type ControlWidthOptions,
} from '@kbn/esql-types';
import { aggFunctionDefinitions } from '@kbn/esql-validation-autocomplete';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { ControlWidth, ControlLabel } from './shared_form_components';
import { getQueryForFields } from './helpers';

interface IdentifierControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  variableName: string;
  queryString: string;
  setControlState: (state: ESQLControlState) => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export function IdentifierControlForm({
  variableType,
  variableName,
  initialState,
  queryString,
  cursorPosition,
  setControlState,
  search,
}: IdentifierControlFormProps) {
  const isMounted = useMountedState();

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
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

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
        const aggregatedFunctions = aggFunctionDefinitions.map((func) => {
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

  const onIdentifiersChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedIdentifiers(selectedOptions);
  }, []);

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

  useEffect(() => {
    const availableOptions = selectedIdentifiers.map((value) => value.label);
    // removes the double question mark from the variable name
    const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || variableNameWithoutQuestionmark,
      variableName: variableNameWithoutQuestionmark,
      variableType,
      esqlQuery: queryString,
      controlType: EsqlControlType.STATIC_VALUES,
      grow,
    };
    if (!isEqual(state, initialState)) {
      setControlState(state);
    }
  }, [
    grow,
    initialState,
    label,
    minimumWidth,
    queryString,
    selectedIdentifiers,
    setControlState,
    variableName,
    variableType,
  ]);

  return (
    <>
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
          isClearable
          css={css`
            .euiFormControlLayoutIcons {
              align-items: flex-start;
              padding-block-start: 1ch;
            }
          `}
        />
      </EuiFormRow>

      <ControlLabel label={label} onLabelChange={onLabelChange} />

      <ControlWidth
        minimumWidth={minimumWidth}
        grow={grow}
        onMinimumSizeChange={onMinimumSizeChange}
        onGrowChange={onGrowChange}
      />
    </>
  );
}
