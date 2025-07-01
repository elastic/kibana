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
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import { ESQLVariableType, type ESQLControlVariable, type ESQLControlState } from '@kbn/esql-types';
import { getValuesFromQueryField } from '@kbn/esql-utils';
import { EsqlControlType, VariableNamePrefix } from '@kbn/esql-types';
import type { ISearchGeneric } from '@kbn/search-types';
import { monaco } from '@kbn/monaco';
import { ValueControlForm } from './value_control_form';
import { Header, ControlType, VariableName, Footer } from './shared_form_components';
import { IdentifierControlForm } from './identifier_control_form';
import {
  updateQueryStringWithVariable,
  getFlyoutStyling,
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
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  closeFlyout: () => void;
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
  const styling = useMemo(() => getFlyoutStyling(), []);
  const suggestedVariableName = useMemo(() => {
    const existingVariables = new Set(
      esqlVariables
        .filter((variable) => variable.type === initialVariableType)
        .map((variable) => variable.key)
    );

    if (initialState) {
      return `${variableNamePrefix}${initialState.variableName}`;
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
    initialState?.controlType ??
      (initialVariableType === ESQLVariableType.VALUES
        ? EsqlControlType.VALUES_FROM_QUERY
        : EsqlControlType.STATIC_VALUES)
  );
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [variableType, setVariableType] = useState<ESQLVariableType>(initialVariableType);

  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [controlState, setControlState] = useState<ESQLControlState | undefined>(initialState);

  const areValuesValid = useMemo(() => {
    const available = controlState?.availableOptions ?? [];
    return variableType === ESQLVariableType.TIME_LITERAL
      ? areValuesIntervalsValid(available.map((option) => option))
      : true;
  }, [variableType, controlState?.availableOptions]);

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
        !controlState?.availableOptions.length
    );
  }, [
    isControlInEditMode,
    areValuesValid,
    controlState?.availableOptions.length,
    esqlVariables,
    variableName,
    variableType,
  ]);

  const onFlyoutTypeChange = useCallback((controlType: EsqlControlType) => {
    setControlFlyoutType(controlType);
  }, []);

  const onCreateControl = useCallback(async () => {
    if (controlState && controlState.availableOptions.length) {
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
  ]);

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
      />
    ) : (
      <IdentifierControlForm
        variableType={variableType}
        variableName={variableName}
        queryString={queryString}
        setControlState={setControlState}
        initialState={initialState}
        search={search}
        cursorPosition={cursorPosition}
      />
    );

  return (
    <>
      <Header isInEditMode={isControlInEditMode} />
      <EuiFlyoutBody
        css={css`
          ${styling}
        `}
      >
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
        isControlInEditMode={isControlInEditMode}
        variableName={variableName}
        onCancelControl={onCancelControl}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateControl}
      />
    </>
  );
}
