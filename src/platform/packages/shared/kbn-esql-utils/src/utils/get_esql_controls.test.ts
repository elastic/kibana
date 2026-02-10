/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { EsqlControlType, ESQLVariableType, type ESQLControlState } from '@kbn/esql-types';
import type { PresentationContainer } from '@kbn/presentation-containers';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { getEsqlControls } from './get_esql_controls';
import { getESQLQueryVariables } from './query_parsing_helpers';

const getESQLQueryVariablesMock = jest.mocked(getESQLQueryVariables);

jest.mock('./query_parsing_helpers', () => {
  const originalModule = jest.requireActual('./query_parsing_helpers');

  return {
    ...originalModule,
    getESQLQueryVariables: jest.fn(originalModule.getESQLQueryVariables),
  };
});

const createPresentationContainer = (children: unknown[]) =>
  ({
    ...getMockPresentationContainer(),
    children$: {
      getValue: () => Object.fromEntries(children.map((child, index) => [`child-${index}`, child])),
    },
  } as unknown as PresentationContainer);

const createControlState = (variableName: string): ESQLControlState => ({
  title: 'Control title',
  selectedOptions: ['option-1'],
  variableName,
  variableType: ESQLVariableType.VALUES,
  esqlQuery: 'FROM index',
  controlType: EsqlControlType.STATIC_VALUES,
  singleSelect: true,
  availableOptions: ['option-1', 'option-2'],
});

const createControlApi = (uuid: string, state: ESQLControlState, type = ESQL_CONTROL) => ({
  uuid,
  type,
  serializeState: () => state,
});

describe('getEsqlControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when query is not an aggregate query', () => {
    // Given
    const presentationContainer = createPresentationContainer([]);
    const regularQuery = {
      query: 'response:200',
      language: 'kuery',
    } as Query;

    // When / Then
    expect(getEsqlControls(presentationContainer, undefined)).toBeUndefined();
    expect(getEsqlControls(presentationContainer, regularQuery)).toBeUndefined();
    expect(getESQLQueryVariablesMock).not.toHaveBeenCalled();
  });

  it('returns only matching ES|QL controls with valid APIs', () => {
    // Given
    getESQLQueryVariablesMock.mockReturnValue(['status']);
    const matchingState = createControlState('status');
    const nonMatchingState = createControlState('host');
    const noVariableState = createControlState('');
    const presentationContainer = createPresentationContainer([
      createControlApi('matching-control', matchingState),
      createControlApi('other-control', nonMatchingState),
      createControlApi('empty-variable-control', noVariableState),
      createControlApi('wrong-type-control', matchingState, 'RANGE_SLIDER_CONTROL'),
      { uuid: 'no-serialize', type: ESQL_CONTROL },
      { type: ESQL_CONTROL, serializeState: () => matchingState },
      null,
    ]);
    const query = {
      esql: 'FROM logs-* | WHERE status == ?status',
    } as AggregateQuery;

    // When / Then
    expect(getEsqlControls(presentationContainer, query)).toStrictEqual({
      'matching-control': {
        type: ESQL_CONTROL,
        ...matchingState,
      },
    });
    expect(getESQLQueryVariablesMock).toHaveBeenCalledWith('FROM logs-* | WHERE status == ?status');
  });
});
