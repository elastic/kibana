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
import { EuiFieldText, EuiFormRow, EuiFlyoutBody, type EuiSwitchEvent } from '@elastic/eui';
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
import { getRecurrentVariableName } from './helpers';
import { EsqlControlFlyoutType } from '../types';

interface IntervalControlFormProps {
  controlType: EsqlControlType;
  queryString: string;
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onEditControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  initialState?: ESQLControlState;
  onCancelControlCallback?: () => void;
}

const SUGGESTED_VALUES = ['5 minutes', '1 hour', '1 day', '1 week', '1 month'];

export function IntervalControlForm({
  controlType,
  initialState,
  queryString,
  closeFlyout,
  onCreateControl,
  onEditControl,
  onCancelControlCallback,
}: IntervalControlFormProps) {
  const suggestedStaticValues = useMemo(
    () => (initialState ? initialState.availableOptions : SUGGESTED_VALUES),
    [initialState]
  );

  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(controlType);

    return initialState
      ? `${initialState.variableName}`
      : getRecurrentVariableName(
          'interval',
          existingVariables.map((variable) => variable.key)
        );
  }, [controlType, initialState]);

  const [values, setValues] = useState<string | undefined>(suggestedStaticValues.join(','));
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  const areValuesValid = useMemo(() => {
    return areValuesIntervalsValid(values);
  }, [values]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    setFormIsInvalid(!values || !variableName || variableExists || !areValuesValid);
  }, [areValuesValid, isControlInEditMode, values, variableName]);

  const onValuesChange = useCallback(
    (e: { target: { value: React.SetStateAction<string | undefined> } }) => {
      setValues(e.target.value);
    },
    []
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
    const availableOptions = values?.split(',').map((value) => value.trim()) ?? [];
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
    values,
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
          label={i18n.translate('esql.flyout.values.label', {
            defaultMessage: 'Values',
          })}
          helpText={i18n.translate('esql.flyout.values.helpText', {
            defaultMessage:
              'Comma separated values (e.g. 5 minutes, 1 hour, 1 day, 1 week, 1 year)',
          })}
          fullWidth
          isInvalid={!values || !areValuesValid}
          error={
            !values
              ? i18n.translate('esql.flyout.values.error', {
                  defaultMessage: 'Values are required',
                })
              : !areValuesValid
              ? i18n.translate('esql.flyout.valuesInterval.error', {
                  defaultMessage: 'Interval values are not valid',
                })
              : undefined
          }
        >
          <EuiFieldText
            placeholder={i18n.translate('esql.flyout.values.placeholder', {
              defaultMessage: 'Set the static values',
            })}
            value={values}
            onChange={onValuesChange}
            aria-label={i18n.translate('esql.flyout.values.placeholder', {
              defaultMessage: 'Set the static values',
            })}
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
        onCancelControlCallback={onCancelControlCallback}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateIntervalControl}
      />
    </>
  );
}
