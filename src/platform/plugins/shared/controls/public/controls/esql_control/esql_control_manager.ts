/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'react-fast-compare';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  filter,
  map,
  merge,
  of,
  skip,
  switchMap,
} from 'rxjs';

import type { OptionsListSearchTechnique, OptionsListSelection } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { ESQLControlState, ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import {
  fetch$,
  apiHasSections,
  type PublishingSubject,
  type StateComparators,
} from '@kbn/presentation-publishing';
import { hasStartEndParams } from '@kbn/esql-utils';

import type { TimeRange } from '@kbn/es-query';
import type { OptionsListSuggestions } from '../../../common/options_list';
import { dataService } from '../../services/kibana_services';
import { initializeTemporayStateManager } from '../data_controls/options_list_control/temporay_state_manager';
import { getESQLSingleColumnValues } from './utils/get_esql_single_column_values';

function selectedOptionsComparatorFunction(a?: OptionsListSelection[], b?: OptionsListSelection[]) {
  return deepEqual(a ?? [], b ?? []);
}

export const selectionComparators: StateComparators<
  Pick<
    ESQLControlState,
    | 'selectedOptions'
    | 'availableOptions'
    | 'variableName'
    | 'singleSelect'
    | 'variableType'
    | 'controlType'
    | 'esqlQuery'
    | 'title'
  >
> = {
  selectedOptions: selectedOptionsComparatorFunction,
  availableOptions: (a, b, lastState, currentState) => {
    // Only compare availableOptions for static values controls; values from query fetch these at runtime
    if (
      lastState?.controlType === currentState?.controlType &&
      currentState?.controlType === EsqlControlType.VALUES_FROM_QUERY
    ) {
      return true;
    }
    return deepEqual(a ?? [], b ?? []);
  },
  variableName: 'referenceEquality',
  variableType: 'referenceEquality',
  controlType: 'referenceEquality',
  esqlQuery: 'referenceEquality',
  title: 'referenceEquality',
  singleSelect: 'referenceEquality',
};

export function initializeESQLControlManager(
  uuid: string,
  parentApi: unknown,
  initialState: ESQLControlState,
  setDataLoading: (loading: boolean) => void
) {
  const sectionId$ = apiHasSections(parentApi) ? parentApi.panelSection$(uuid) : of(undefined);

  const availableOptions$ = new BehaviorSubject<string[]>(initialState.availableOptions ?? []);
  const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
  const hasSelections$ = new BehaviorSubject<boolean>(false); // hardcoded to false to prevent clear action from appearing.
  const singleSelect$ = new BehaviorSubject<boolean>(initialState.singleSelect ?? true);
  const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
  const variableType$ = new BehaviorSubject<ESQLVariableType>(
    initialState.variableType ?? ESQLVariableType.VALUES
  );
  const controlType$ = new BehaviorSubject<EsqlControlType>(initialState.controlType ?? '');
  const esqlQuery$ = new BehaviorSubject<string>(initialState.esqlQuery ?? '');
  const title$ = new BehaviorSubject<string | undefined>(initialState.title);
  const totalCardinality$ = new BehaviorSubject<number>(initialState.availableOptions?.length ?? 0);

  const searchString$ = new BehaviorSubject<string>('');
  const displayedAvailableOptions$ = new BehaviorSubject<OptionsListSuggestions | undefined>(
    initialState.availableOptions?.map((value) => ({ value })) ?? []
  );

  // Use it for incompatible suggestions
  const temporaryStateManager = initializeTemporayStateManager();

  function setSearchString(next: string) {
    searchString$.next(next);
  }

  function setSelectedOptions(next: OptionsListSelection[] | undefined) {
    if (!next) return;
    const selected = next as string[];
    if (!selectedOptionsComparatorFunction(selectedOptions$.value, selected)) {
      selectedOptions$.next(selected);
    }
  }

  function haveVariablesValuesChanged(
    currentVariables: ESQLControlVariable[],
    previousVariables: ESQLControlVariable[],
    variablesInQuery: string[]
  ): boolean {
    if (variablesInQuery.length === 0) return false;

    for (const variableName of variablesInQuery) {
      const currentVariable = currentVariables.find((v) => v.key === variableName);
      const previousVariable = previousVariables.find((v) => v.key === variableName);

      if (!deepEqual(currentVariable?.value, previousVariable?.value)) {
        return true;
      }
    }
    return false;
  }

  // For Values From Query controls, update values on dashboard load/reload
  // or when dependencies change in case of chaining controls
  let previousESQLVariables: ESQLControlVariable[] = [];
  let previousTimeRange: TimeRange | undefined;
  let hasInitialFetch = false;
  const fetchSubscription = fetch$({ uuid, parentApi })
    .pipe(
      filter(() => controlType$.getValue() === EsqlControlType.VALUES_FROM_QUERY),
      filter(({ esqlVariables, timeRange }) => {
        if (hasStartEndParams(esqlQuery$.getValue()) && !timeRange) {
          return false;
        }
        const variablesInQuery = getESQLQueryVariables(esqlQuery$.getValue());
        const variablesInParent = esqlVariables || [];

        // Filter out this control's own variable
        const currentVariableName = variableName$.getValue();
        const externalVariables = variablesInParent.filter(
          (variable) => variable.key !== currentVariableName
        );

        // Check if timeRange has changed
        const timeRangeChanged = !deepEqual(previousTimeRange, timeRange);

        const shouldFetch =
          !hasInitialFetch ||
          timeRangeChanged ||
          haveVariablesValuesChanged(externalVariables, previousESQLVariables, variablesInQuery);

        if (shouldFetch) {
          previousESQLVariables = [...externalVariables];
          previousTimeRange = timeRange ? { ...timeRange } : undefined;
          hasInitialFetch = true;
        }

        return shouldFetch;
      }),
      switchMap(async ({ timeRange, esqlVariables }) => {
        setDataLoading(true);
        const variablesInParent = esqlVariables || [];

        return await getESQLSingleColumnValues({
          query: esqlQuery$.getValue(),
          search: dataService.search.search,
          timeRange,
          esqlVariables: variablesInParent,
        });
      })
    )
    .subscribe((result) => {
      setDataLoading(false);
      if (getESQLSingleColumnValues.isSuccess(result)) {
        const newAvailableOptions = result.values.map((value) => value);
        availableOptions$.next(newAvailableOptions);

        // Check if current selections are still compatible
        const currentSelections = selectedOptions$.getValue() ?? [];
        const incompatibleSelections = new Set<OptionsListSelection>();

        currentSelections.forEach((selection) => {
          if (!newAvailableOptions.includes(selection)) {
            incompatibleSelections.add(selection);
          }
        });

        // Update incompatible selections
        temporaryStateManager.api.setInvalidSelections(incompatibleSelections);
      }
    });

  // Filter the displayed available options by the current search string
  // TODO: Run this filtering server-side instead of client side; this just replicates the basic behavior
  // of a combo box dropdown for keyboard accessibility
  const availableOptionsSearchSubscription = combineLatest([searchString$, availableOptions$])
    .pipe(debounceTime(50))
    .subscribe(([searchString, availableOptions]) => {
      const displayOptions =
        availableOptions?.filter((option) => option.includes(searchString)) ?? [];
      displayedAvailableOptions$.next(displayOptions.map((value) => ({ value })));
      totalCardinality$.next(displayOptions.length);
    });

  // derive ESQL control variable from state.
  const getEsqlVariable = (sectionId?: string) => {
    const isSingleSelect = singleSelect$.value;
    const selectedValues = selectedOptions$.value;

    // For single select, return the first value; for multi-select, return the array
    let value: ESQLControlVariable['value'];

    if (isSingleSelect) {
      // Single select: return the first value or empty string if none selected
      const firstValue = selectedValues[0];
      if (firstValue !== undefined) {
        value = isNaN(Number(firstValue)) ? firstValue : Number(firstValue);
      } else {
        value = '';
      }
    } else {
      // Multi-select: return array of all selected values
      value = selectedValues.map((val) => (isNaN(Number(val)) ? val : Number(val)));
    }

    return {
      key: variableName$.value,
      value,
      type: variableType$.value,
      meta: {
        controlledBy: uuid,
        ...(sectionId && { group: sectionId }),
      },
    };
  };

  const startingSection = apiHasSections(parentApi) ? parentApi.getPanelSection(uuid) : undefined;
  const esqlVariable$ = new BehaviorSubject<ESQLControlVariable>(getEsqlVariable(startingSection));
  const variableSubscriptions = combineLatest([
    sectionId$,
    variableName$,
    variableType$,
    selectedOptions$,
    availableOptions$,
    singleSelect$,
  ])
    .pipe(skip(1)) // esqlVariable$ is initialized above
    .subscribe(([sectionId]) => {
      const newVariables = getEsqlVariable(sectionId);
      if (!deepEqual(esqlVariable$.getValue(), newVariables))
        esqlVariable$.next(getEsqlVariable(sectionId));
    });

  return {
    cleanup: () => {
      variableSubscriptions.unsubscribe();
      fetchSubscription.unsubscribe();
      availableOptionsSearchSubscription.unsubscribe();
    },
    api: {
      hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
      esqlVariable$: esqlVariable$ as PublishingSubject<ESQLControlVariable>,
      singleSelect$: singleSelect$ as PublishingSubject<boolean>,
    },
    anyStateChange$: merge(
      selectedOptions$,
      availableOptions$,
      variableName$,
      singleSelect$,
      variableType$,
      controlType$,
      esqlQuery$,
      title$
    ).pipe(map(() => undefined)),
    reinitializeState: (lastSaved?: ESQLControlState) => {
      setSelectedOptions(lastSaved?.selectedOptions ?? []);
      availableOptions$.next(lastSaved?.availableOptions ?? []);
      variableName$.next(lastSaved?.variableName ?? '');
      singleSelect$.next(lastSaved?.singleSelect ?? true);
      variableType$.next(lastSaved?.variableType ?? ESQLVariableType.VALUES);
      if (lastSaved?.controlType) controlType$.next(lastSaved?.controlType);
      esqlQuery$.next(lastSaved?.esqlQuery ?? '');
      title$.next(lastSaved?.title);
      temporaryStateManager.api.setInvalidSelections(new Set());
      previousESQLVariables = [];
      previousTimeRange = undefined;
      hasInitialFetch = false;
    },
    getLatestState: () => {
      return {
        selectedOptions: selectedOptions$.getValue() ?? [],
        ...(controlType$.getValue() === EsqlControlType.STATIC_VALUES
          ? { availableOptions: availableOptions$.getValue() ?? [] }
          : {}),
        variableName: variableName$.getValue() ?? '',
        singleSelect: singleSelect$.getValue() ?? true,
        variableType: variableType$.getValue() ?? ESQLVariableType.VALUES,
        controlType: controlType$.getValue(),
        esqlQuery: esqlQuery$.getValue() ?? '',
        title: title$.getValue() ?? '',
      };
    },
    internalApi: {
      selectedOptions$: selectedOptions$ as PublishingSubject<OptionsListSelection[] | undefined>,
      availableOptions$: displayedAvailableOptions$,
      totalCardinality$,
      title$,
      setSelectedOptions,
      setSearchString,
      field$: new BehaviorSubject<DataViewField | undefined>({ type: 'string' } as DataViewField),
      searchTechnique$: new BehaviorSubject<OptionsListSearchTechnique | undefined>('wildcard'),
      searchString$,
      searchStringValid$: new BehaviorSubject(true),
      invalidSelections$: temporaryStateManager.api.invalidSelections$,
      setInvalidSelections: temporaryStateManager.api.setInvalidSelections,
    },
  };
}
