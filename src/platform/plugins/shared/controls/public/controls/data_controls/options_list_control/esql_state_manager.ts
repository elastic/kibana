/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateComparators } from '@kbn/presentation-publishing/state_manager';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { ESQLControlVariable, ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import type {
  OptionsListESQLControlState,
  OptionsListSelection,
} from '../../../../common/options_list';

type ESQLOptionsListInputState = Partial<
  Pick<OptionsListESQLControlState, 'esqlQuery' | 'variableName' | 'variableType' | 'controlType'>
>;

interface OptionsListESQLState {
  esqlQuery?: string;
  esqlVariable?: ESQLControlVariable;
  esqlControlType?: EsqlControlType;
}

export const esqlComparators: StateComparators<OptionsListESQLState> = {
  esqlQuery: 'referenceEquality',
  esqlVariable: 'deepEquality',
  esqlControlType: 'referenceEquality',
};

const defaultESQLState = {
  esqlQuery: undefined,
  esqlVariable: undefined,
  esqlControlType: undefined,
};

const getEsqlVariable = (
  variableName: string,
  variableType: ESQLVariableType,
  selectedValue: string | number
) => ({
  key: variableName,
  value: isNaN(Number(selectedValue)) ? selectedValue : Number(selectedValue),
  type: variableType,
});

export const initializeESQLStateManager = (
  inputState: ESQLOptionsListInputState,
  selectedOptions$: PublishingSubject<OptionsListSelection[] | undefined>
) => {
  const initialState = {
    esqlQuery: inputState.esqlQuery ?? defaultESQLState.esqlQuery,
    esqlVariable:
      inputState.esqlQuery && inputState.variableName && inputState.variableType
        ? getEsqlVariable(
            inputState.variableName,
            inputState.variableType,
            selectedOptions$.getValue()?.[0] ?? ''
          )
        : defaultESQLState.esqlVariable,
    esqlControlType: inputState.controlType,
  };

  return initializeStateManager<OptionsListESQLState>(
    initialState,
    defaultESQLState,
    esqlComparators
  );
};
