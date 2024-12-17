/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import type { ISearchGeneric } from '@kbn/search-types';
import { monaco } from '@kbn/monaco';
import { esqlVariablesService } from '@kbn/esql-variables/common';
import type { ESQLControlState } from '../types';
import { IntervalControlForm } from './interval_control_form';
import { ValueControlForm } from './value_control_form';
import { FieldControlForm } from './field_control_form';
import { updateQueryStringWithVariable } from './helpers';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  onSaveControlCb?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControlCb?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  closeFlyout: () => void;
}

export function ESQLControlsFlyout({
  search,
  controlType,
  queryString,
  onSaveControlCb,
  onCancelControlCb,
  cursorPosition,
  initialState,
  closeFlyout,
}: ESQLControlsFlyoutProps) {
  const addToESQLVariablesService = useCallback(
    (varName: string, variableValue: string, variableType: EsqlControlType) => {
      if (esqlVariablesService.variableExists(varName)) {
        esqlVariablesService.removeVariable(varName);
      }
      esqlVariablesService.addVariable({
        key: varName,
        value: variableValue,
        type: variableType,
      });
    },
    []
  );

  const onCreateControl = useCallback(
    async (state: ESQLControlState, variableName: string, variableValue: string) => {
      if (cursorPosition) {
        const query = updateQueryStringWithVariable(queryString, variableName, cursorPosition);
        addToESQLVariablesService(variableName, variableValue, controlType);

        await onSaveControlCb?.(state, query);
      }
    },
    [addToESQLVariablesService, controlType, cursorPosition, onSaveControlCb, queryString]
  );

  const onEditControl = useCallback(
    async (state: ESQLControlState, variableName: string, variableValue: string) => {
      await onSaveControlCb?.(state, '');
      addToESQLVariablesService(variableName, variableValue, controlType);
    },
    [addToESQLVariablesService, controlType, onSaveControlCb]
  );

  if (controlType === EsqlControlType.TIME_LITERAL) {
    return (
      <IntervalControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        onCancelControlCb={onCancelControlCb}
        initialState={initialState}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
      />
    );
  } else if (controlType === EsqlControlType.VALUES) {
    return (
      <ValueControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        onCancelControlCb={onCancelControlCb}
        initialState={initialState}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        search={search}
      />
    );
  } else if (controlType === EsqlControlType.FIELDS) {
    return (
      <FieldControlForm
        controlType={controlType}
        queryString={queryString}
        onCancelControlCb={onCancelControlCb}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        initialState={initialState}
        closeFlyout={closeFlyout}
        search={search}
      />
    );
  }

  return null;
}
