/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { ESQLControlVariable, ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import type { ESQLControlState } from '@kbn/esql/public';

export function initializeESQLControlSelections(initialState: ESQLControlState) {
  const availableOptions$ = new BehaviorSubject<string[]>(initialState.availableOptions ?? []);
  const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
  const hasSelections$ = new BehaviorSubject<boolean>(false); // hardcoded to false to prevent clear action from appearing.
  const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
  const variableType$ = new BehaviorSubject<ESQLVariableType>(
    initialState.variableType ?? ESQLVariableType.VALUES
  );
  const controlType$ = new BehaviorSubject<string>(initialState.controlType ?? '');
  const esqlQuery$ = new BehaviorSubject<string>(initialState.esqlQuery ?? '');
  const title$ = new BehaviorSubject<string | undefined>(initialState.title);

  const selectedOptionsComparatorFunction = (a: string[], b: string[]) =>
    deepEqual(a ?? [], b ?? []);

  function setSelectedOptions(next: string[]) {
    if (!selectedOptionsComparatorFunction(selectedOptions$.value, next)) {
      selectedOptions$.next(next);
    }
  }

  // derive ESQL control variable from state.
  const getEsqlVariable = () => ({
    key: variableName$.value,
    value: selectedOptions$.value[0],
    type: variableType$.value,
  });
  const esqlVariable$ = new BehaviorSubject<ESQLControlVariable>(getEsqlVariable());
  const subscriptions = combineLatest([variableName$, variableType$, selectedOptions$]).subscribe(
    () => esqlVariable$.next(getEsqlVariable())
  );

  return {
    cleanup: () => subscriptions.unsubscribe(),
    api: {
      hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
      esqlVariable$: esqlVariable$ as PublishingSubject<ESQLControlVariable>,
    },
    comparators: {
      selectedOptions: [selectedOptions$, setSelectedOptions, selectedOptionsComparatorFunction],
      availableOptions: [availableOptions$, (next) => availableOptions$.next(next)],
      variableName: [variableName$, (next) => variableName$.next(next)],
      variableType: [variableType$, (next) => variableType$.next(next)],
      controlType: [controlType$, (next) => controlType$.next(next)],
      esqlQuery: [esqlQuery$, (next) => esqlQuery$.next(next)],
      title: [title$, (next) => title$.next(next)],
    } as StateComparators<
      Pick<
        ESQLControlState,
        | 'selectedOptions'
        | 'availableOptions'
        | 'variableName'
        | 'variableType'
        | 'controlType'
        | 'esqlQuery'
        | 'title'
      >
    >,
    hasInitialSelections: initialState.selectedOptions?.length,
    selectedOptions$: selectedOptions$ as PublishingSubject<string[]>,
    availableOptions$: availableOptions$ as PublishingSubject<string[]>,
    variableName$: variableName$ as PublishingSubject<string>,
    variableType$: variableType$ as PublishingSubject<string>,
    controlType$: controlType$ as PublishingSubject<string>,
    esqlQuery$: esqlQuery$ as PublishingSubject<string>,
    title$: title$ as PublishingSubject<string | undefined>,
    setSelectedOptions,
  };
}
