/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import {
  ESQLVariableType,
  ESQLControlVariable,
  ESQLVariableESType,
} from '@kbn/esql-validation-autocomplete';
import { getValuesFromQueryField } from '@kbn/esql-utils';
import { css } from '@emotion/react';
import type { ISearchGeneric } from '@kbn/search-types';
import { monaco } from '@kbn/monaco';
import { Header, ControlType, VariableName, Footer } from './shared_form_components';
import { type ESQLControlState, EsqlControlType } from '../types';
import { ValueControlForm } from './value_control_form';
import { IdentifierControlForm } from './identifier_control_form';
import {
  updateQueryStringWithVariable,
  getFlyoutStyling,
  getVariablePrefix,
  getRecurrentVariableName,
  validateVariableName,
  areValuesIntervalsValid,
} from './helpers';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  queryString: string;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  closeFlyout: () => void;
}

function mapToESType(type: ESQLVariableType) {
  switch (type) {
    case ESQLVariableType.FIELDS:
    case ESQLVariableType.FUNCTIONS:
      return ESQLVariableESType.IDENTIFIER;
    case ESQLVariableType.VALUES:
    case ESQLVariableType.TIME_LITERAL:
    // unknown should be treated as values in initialization
    case ESQLVariableType.UNKNOWN:
    default:
      return ESQLVariableESType.VALUE;
  }
}

export function ESQLControlsFlyout({
  search,
  variableType,
  queryString,
  esqlVariables,
  onSaveControl,
  onCancelControl,
  cursorPosition,
  initialState,
  closeFlyout,
}: ESQLControlsFlyoutProps) {
  const valuesField = useMemo(() => {
    if (variableType === ESQLVariableType.VALUES) {
      return getValuesFromQueryField(queryString);
    }
    return null;
  }, [variableType, queryString]);

  const suggestedVariableName = useMemo(() => {
    const existingVariables = new Set(
      esqlVariables
        .filter((variable) => variable.type === variableType)
        .map((variable) => variable.key)
    );

    if (initialState) {
      return initialState.variableName;
    }

    let variablePrefix = getVariablePrefix(variableType);

    if (valuesField && variableType === ESQLVariableType.VALUES) {
      // variables names can't have special characters, only underscore
      const fieldVariableName = valuesField.replace(/[^a-zA-Z0-9]/g, '_');
      variablePrefix = fieldVariableName;
    }

    return getRecurrentVariableName(variablePrefix, existingVariables);
  }, [esqlVariables, initialState, valuesField, variableType]);

  const esType = mapToESType(variableType);

  const [formIsInvalid, setFormIsInvalid] = useState(false);

  const [controlState, setControlState] = useState<ESQLControlState | undefined>(initialState);

  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [controlFlyoutType, setControlFlyoutType] = useState<EsqlControlType>(
    initialState?.controlType ??
      (variableType === ESQLVariableType.TIME_LITERAL || variableType === ESQLVariableType.UNKNOWN
        ? EsqlControlType.STATIC_VALUES
        : EsqlControlType.VALUES_FROM_QUERY)
  );

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      const text = validateVariableName(String(e.target.value));
      setVariableName(text);
    },
    []
  );

  const onFlyoutTypeChange = useCallback((controlType: EsqlControlType) => {
    setControlFlyoutType(controlType);
  }, []);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);
  const areValuesValid = useMemo(() => {
    const available = controlState?.availableOptions ?? [];
    return variableType === ESQLVariableType.TIME_LITERAL
      ? areValuesIntervalsValid(available.map((option) => option))
      : true;
  }, [variableType, controlState?.availableOptions]);

  useEffect(() => {
    const variableExists =
      esqlVariables.some((variable) => variable.key === variableName.replace('?', '')) &&
      !isControlInEditMode;
    setFormIsInvalid(
      !variableName || variableExists || !areValuesValid || !controlState?.availableOptions.length
    );
  }, [
    areValuesValid,
    controlState?.availableOptions.length,
    esqlVariables,
    isControlInEditMode,
    variableName,
  ]);

  const onCreateControl = useCallback(async () => {
    if (controlState && controlState.availableOptions.length) {
      if (!isControlInEditMode) {
        if (cursorPosition) {
          const query = updateQueryStringWithVariable(
            queryString,
            variableName,
            cursorPosition,
            variableType
          );
          await onSaveControl?.(controlState, query);
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
    variableType,
    onSaveControl,
  ]);

  const styling = useMemo(() => getFlyoutStyling(), []);

  const formBody =
    esType === ESQLVariableESType.VALUE ? (
      <ValueControlForm
        queryString={queryString}
        variableName={variableName}
        controlFlyoutType={controlFlyoutType}
        esqlVariables={esqlVariables}
        variableType={variableType}
        initialState={initialState}
        search={search}
        controlState={controlState}
        setControlState={setControlState}
      />
    ) : (
      <IdentifierControlForm
        variableType={variableType}
        variableName={variableName}
        esqlVariables={esqlVariables}
        queryString={queryString}
        initialState={initialState}
        search={search}
        cursorPosition={cursorPosition}
        controlState={controlState}
        setControlState={setControlState}
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
