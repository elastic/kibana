/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import type { ESQLEditorTelemetryService } from '@kbn/esql-editor';
import type { TimeRange } from '@kbn/es-query';
import {
  ESQLVariableType,
  EsqlControlType,
  VariableNamePrefix,
  TelemetryControlCancelledReason,
  type ESQLControlVariable,
  type ControlTriggerSource,
} from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { getValuesFromQueryField } from '@kbn/esql-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import type { monaco } from '@kbn/monaco';
import { ValueControlForm } from './value_control_form';
import { Header, ControlType, VariableName, Footer } from './shared_form_components';
import { IdentifierControlForm } from './identifier_control_form';
import {
  updateQueryStringWithVariable,
  flyoutStyles,
  getVariableSuggestion,
  getRecurrentVariableName,
  validateVariableName,
  areValuesIntervalsValid,
  getVariableTypeFromQuery,
  getVariableNamePrefix,
  checkVariableExistence,
} from './helpers';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  initialVariableType: ESQLVariableType;
  queryString: string;
  esqlVariables: ESQLControlVariable[];
  timeRange?: TimeRange;
  onSaveControl?: (
    controlState: OptionsListESQLControlState,
    updatedQuery: string
  ) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: OptionsListESQLControlState;
  closeFlyout: () => void;
  ariaLabelledBy: string;
  currentApp?: string;
  telemetryTriggerSource?: ControlTriggerSource;
  telemetryService: ESQLEditorTelemetryService;
}

export function ESQLControlsFlyout({
  search,
  initialVariableType,
  queryString,
  esqlVariables,
  timeRange,
  onSaveControl,
  onCancelControl,
  cursorPosition,
  initialState,
  closeFlyout,
  ariaLabelledBy,
  currentApp,
  telemetryTriggerSource,
  telemetryService,
}: ESQLControlsFlyoutProps) {
  // ?? or ?
  const [variableNamePrefix, setVariableNamePrefix] = useState(
    getVariableNamePrefix(initialVariableType)
  );
  const valuesField = useMemo(() => {
    if (initialVariableType === ESQLVariableType.VALUES) {
      return getValuesFromQueryField(queryString, cursorPosition);
    }
    return undefined;
  }, [cursorPosition, initialVariableType, queryString]);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);
  const suggestedVariableName = useMemo(() => {
    const existingVariables = new Set(
      esqlVariables
        .filter((variable) => variable.type === initialVariableType)
        .map((variable) => variable.key)
    );

    if (initialState) {
      return `${variableNamePrefix}${initialState.variable_name}`;
    }

    let variableNameSuggestion = getVariableSuggestion(initialVariableType);

    if (valuesField && initialVariableType === ESQLVariableType.VALUES) {
      // variables names can't have special characters, only underscore
      const fieldVariableName = valuesField.replace(/[^a-zA-Z0-9]/g, '_');
      variableNameSuggestion = fieldVariableName;
    }

    return `${variableNamePrefix}${getRecurrentVariableName(
      variableNameSuggestion,
      existingVariables
    )}`;
  }, [esqlVariables, initialState, valuesField, variableNamePrefix, initialVariableType]);

  const [controlFlyoutType, setControlFlyoutType] = useState<EsqlControlType>(
    (initialState?.control_type ??
      (initialVariableType === ESQLVariableType.VALUES
        ? EsqlControlType.VALUES_FROM_QUERY
        : EsqlControlType.STATIC_VALUES)) as EsqlControlType
  );
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [variableType, setVariableType] = useState<ESQLVariableType>(initialVariableType);

  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [controlState, setControlState] = useState<OptionsListESQLControlState | undefined>(
    initialState
  );

  const areValuesValid = useMemo(() => {
    const available = controlState?.available_options ?? [];
    return variableType === ESQLVariableType.TIME_LITERAL
      ? areValuesIntervalsValid(available.map((option) => option))
      : true;
  }, [variableType, controlState?.available_options]);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      const text = validateVariableName(String(e.target.value), variableNamePrefix);
      setVariableName(text);
      const newType = getVariableTypeFromQuery(text, variableType);
      setVariableType(newType);
      setVariableNamePrefix(getVariableNamePrefix(newType));
      if (
        controlFlyoutType === EsqlControlType.VALUES_FROM_QUERY &&
        newType !== ESQLVariableType.VALUES
      ) {
        setControlFlyoutType(EsqlControlType.STATIC_VALUES);
      }
    },
    [controlFlyoutType, variableNamePrefix, variableType]
  );

  useEffect(() => {
    const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
    const variableExists =
      checkVariableExistence(esqlVariables, variableName) && !isControlInEditMode;
    setFormIsInvalid(
      !variableNameWithoutQuestionmark ||
        variableExists ||
        !areValuesValid ||
        !controlState?.available_options?.length
    );
  }, [
    isControlInEditMode,
    areValuesValid,
    controlState?.available_options?.length,
    esqlVariables,
    variableName,
    variableType,
  ]);

  const onFlyoutTypeChange = useCallback((controlType: EsqlControlType) => {
    setControlFlyoutType(controlType);
  }, []);

  const onCreateControl = useCallback(async () => {
    if (controlState && controlState.available_options?.length) {
      if (!isControlInEditMode) {
        if (cursorPosition) {
          const query = updateQueryStringWithVariable(queryString, variableName, cursorPosition);
          await onSaveControl?.(controlState, query);
        } else {
          await onSaveControl?.(controlState, queryString);
        }
      } else {
        await onSaveControl?.(controlState, '');
      }
      if (!isControlInEditMode) {
        telemetryService.trackEsqlControlConfigSaved(
          variableType,
          telemetryTriggerSource as ControlTriggerSource
        );
      }
    }
    closeFlyout();
  }, [
    controlState,
    closeFlyout,
    isControlInEditMode,
    cursorPosition,
    queryString,
    variableName,
    onSaveControl,
    variableType,
    telemetryTriggerSource,
    telemetryService,
  ]);

  const onCloseFlyout = useCallback(() => {
    telemetryService.trackEsqlControlConfigCancelled(
      initialVariableType,
      TelemetryControlCancelledReason.CANCEL_BUTTON
    );
    closeFlyout();
  }, [closeFlyout, initialVariableType, telemetryService]);

  const formBody =
    variableNamePrefix === VariableNamePrefix.VALUE ? (
      <ValueControlForm
        queryString={queryString}
        variableName={variableName}
        controlFlyoutType={controlFlyoutType}
        variableType={variableType}
        initialState={initialState}
        setControlState={setControlState}
        search={search}
        valuesRetrieval={valuesField}
        timeRange={timeRange}
        esqlVariables={esqlVariables}
      />
    ) : (
      <IdentifierControlForm
        variableType={variableType}
        esqlVariables={esqlVariables}
        variableName={variableName}
        queryString={queryString}
        setControlState={setControlState}
        initialState={initialState}
        search={search}
        cursorPosition={cursorPosition}
        currentApp={currentApp}
      />
    );

  return (
    <>
      <Header isInEditMode={isControlInEditMode} ariaLabelledBy={ariaLabelledBy} />
      <EuiFlyoutBody css={flyoutStyles}>
        <ControlType
          isDisabled={variableType !== ESQLVariableType.VALUES}
          initialControlFlyoutType={controlFlyoutType}
          onFlyoutTypeChange={onFlyoutTypeChange}
        />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
          esqlVariables={esqlVariables}
        />
        {formBody}
      </EuiFlyoutBody>
      <Footer
        onCancelControl={onCancelControl}
        isSaveDisabled={formIsInvalid}
        closeFlyout={onCloseFlyout}
        onCreateControl={onCreateControl}
      />
    </>
  );
}
