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
  EuiFormRow,
  EuiFlyoutBody,
  type EuiSwitchEvent,
  EuiComboBox,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import { esqlVariablesService } from '@kbn/esql-variables/common';
import { areValuesIntervalsValid } from './helpers';
import type { ESQLControlState } from '../types';
import {
  Header,
  Footer,
  ControlWidth,
  ControlType,
  VariableName,
  ControlLabel,
} from './shared_form_components';
import { getRecurrentVariableName, getFlyoutStyling } from './helpers';
import { EsqlControlFlyoutType } from '../types';

interface IntervalControlFormProps {
  controlType: EsqlControlType;
  queryString: string;
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onEditControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  initialState?: ESQLControlState;
  onCancelControlCb?: () => void;
}

const SUGGESTED_VALUES = ['5 minutes', '1 hour', '1 day', '1 week', '1 month'];

export function IntervalControlForm({
  controlType,
  initialState,
  queryString,
  closeFlyout,
  onCreateControl,
  onEditControl,
  onCancelControlCb,
}: IntervalControlFormProps) {
  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(controlType);

    return initialState
      ? `${initialState.variableName}`
      : getRecurrentVariableName(
          'interval',
          existingVariables.map((variable) => variable.key)
        );
  }, [controlType, initialState]);

  const [selectedIntervals, setSelectedIntervals] = useState<EuiComboBoxOptionOption[]>(
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
  const [availableIntervalOptions, setAvailableIntervalOptions] = useState<
    EuiComboBoxOptionOption[]
  >(
    SUGGESTED_VALUES.map((option) => {
      return {
        label: option,
        'data-test-subj': option,
        key: option,
      };
    })
  );
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  const areValuesValid = useMemo(() => {
    return areValuesIntervalsValid(selectedIntervals.map((option) => option.label));
  }, [selectedIntervals]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    setFormIsInvalid(
      !selectedIntervals.length || !variableName || variableExists || !areValuesValid
    );
  }, [areValuesValid, isControlInEditMode, selectedIntervals, variableName]);

  const onIntervalsChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedIntervals(selectedOptions);
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
        setAvailableIntervalOptions([...availableIntervalOptions, newOption]);
      }

      setSelectedIntervals((prevSelected) => [...prevSelected, newOption]);
    },
    [availableIntervalOptions]
  );

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

  const onCreateIntervalControl = useCallback(async () => {
    const availableOptions = selectedIntervals.map((interval) => interval.label);
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
    selectedIntervals,
    minimumWidth,
    label,
    variableName,
    controlType,
    queryString,
    grow,
    closeFlyout,
    isControlInEditMode,
    onCreateControl,
    onEditControl,
  ]);

  const styling = useMemo(() => getFlyoutStyling(), []);

  return (
    <>
      <Header />
      <EuiFlyoutBody
        css={css`
          ${styling}
        `}
      >
        <ControlType isDisabled initialControlFlyoutType={EsqlControlFlyoutType.STATIC_VALUES} />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
        />

        <EuiFormRow
          label={i18n.translate('esql.flyout.values.label', {
            defaultMessage: 'Values',
          })}
          helpText={i18n.translate('esql.flyout.values.helpText', {
            defaultMessage: 'Interval values (e.g. 5 minutes, 1 hour, 1 day, 1 week, 1 year)',
          })}
          fullWidth
          isInvalid={!areValuesValid}
          error={
            !areValuesValid
              ? i18n.translate('esql.flyout.valuesInterval.error', {
                  defaultMessage: 'Interval values are not valid',
                })
              : undefined
          }
        >
          <EuiComboBox
            aria-label={i18n.translate('esql.flyout.values.placeholder', {
              defaultMessage: 'Select the interval values or add a new one',
            })}
            placeholder={i18n.translate('esql.flyout.values.placeholder', {
              defaultMessage: 'Select the interval values or add a new one',
            })}
            options={availableIntervalOptions}
            selectedOptions={selectedIntervals}
            onChange={onIntervalsChange}
            onCreateOption={onCreateOption}
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
        onCreateControl={onCreateIntervalControl}
      />
    </>
  );
}
