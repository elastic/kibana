/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { ESQLVariableType, ESQLControlVariable } from '@kbn/esql-validation-autocomplete';
import type { ISearchGeneric } from '@kbn/search-types';
import { monaco } from '@kbn/monaco';
import type { ESQLControlState } from '../types';
import { ValueControlForm } from './value_control_form';
import { IdentifierControlForm } from './identifier_control_form';
import { updateQueryStringWithVariable } from './helpers';

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
  const onCreateControl = useCallback(
    async (state: ESQLControlState, variableName: string) => {
      if (cursorPosition) {
        const query = updateQueryStringWithVariable(queryString, variableName, cursorPosition);

        await onSaveControl?.(state, query);
      }
    },
    [cursorPosition, onSaveControl, queryString]
  );

  const onEditControl = useCallback(
    async (state: ESQLControlState) => {
      await onSaveControl?.(state, '');
    },
    [onSaveControl]
  );

  if (variableType === ESQLVariableType.VALUES || variableType === ESQLVariableType.TIME_LITERAL) {
    return (
      <ValueControlForm
        queryString={queryString}
        esqlVariables={esqlVariables}
        variableType={variableType}
        closeFlyout={closeFlyout}
        onCancelControl={onCancelControl}
        initialState={initialState}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        search={search}
      />
    );
  } else if (
    variableType === ESQLVariableType.FIELDS ||
    variableType === ESQLVariableType.FUNCTIONS
  ) {
    return (
      <IdentifierControlForm
        variableType={variableType}
        esqlVariables={esqlVariables}
        queryString={queryString}
        onCancelControl={onCancelControl}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        initialState={initialState}
        closeFlyout={closeFlyout}
        search={search}
        cursorPosition={cursorPosition}
      />
    );
  }

  return null;
}
