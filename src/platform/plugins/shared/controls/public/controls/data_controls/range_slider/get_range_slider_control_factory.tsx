/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, first, map, merge, skip } from 'rxjs';

import type { Filter, RangeFilterParams } from '@kbn/es-query';
import { buildRangeFilter } from '@kbn/es-query';
import {
  fetch$,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';

import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { isCompressed } from '../../../control_group/utils/is_compressed';
import {
  defaultDataControlComparators,
  initializeDataControlManager,
} from '../data_control_manager';
import { RangeSliderControl } from './components/range_slider_control';
import { hasNoResults$ } from './has_no_results';
import { minMax$ } from './min_max';
import { initializeRangeControlSelections } from './range_control_selections';
import { RangeSliderStrings } from './range_slider_strings';
import type { RangesliderControlApi, RangesliderControlState } from './types';
import { editorComparators, initializeEditorStateManager } from './editor_state_manager';

export const getRangesliderControlFactory = (): EmbeddableFactory<
  RangesliderControlState,
  RangesliderControlApi
> => {
  return {
    type: RANGE_SLIDER_CONTROL,
    // isFieldCompatible: (field) => {
    //   return field.aggregatable && field.type === 'number';
    // },
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const loadingMinMax$ = new BehaviorSubject<boolean>(false);
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

      const titlesManager = initializeTitleManager(state);
      const editorStateManager = initializeEditorStateManager(state);

      const dataControlManager = await initializeDataControlManager<
        Pick<RangesliderControlState, 'step'>
      >({
        controlId: uuid,
        controlType: RANGE_SLIDER_CONTROL,
        typeDisplayName: RangeSliderStrings.control.getDisplayName(),
        state,
        parentApi,
        editorStateManager,
        titlesManager,
      });

      const selections = initializeRangeControlSelections(
        state,
        dataControlManager.internalApi.onSelectionChange
      );

      function serializeState() {
        return {
          rawState: {
            ...dataControlManager.getLatestState(),
            ...editorStateManager.getLatestState(),
            value: selections.value$.getValue(),
          },
          references: dataControlManager.internalApi.extractReferences('rangeSliderDataView'),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<RangesliderControlState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          dataControlManager.anyStateChange$,
          selections.value$,
          editorStateManager.anyStateChange$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
            ...titleComparators,
            ...editorComparators,
            ...defaultDataControlComparators,
            value: 'referenceEquality',
          };
        },
        onReset: (lastSaved) => {
          dataControlManager.reinitializeState(lastSaved?.rawState);
          editorStateManager.reinitializeState(lastSaved?.rawState);
          selections.setValue(lastSaved?.rawState.value);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...dataControlManager.api,
        dataLoading$,
        serializeState,
        clearSelections: () => {
          selections.setValue(undefined);
        },
        hasSelections$: selections.hasRangeSelection$,
      });

      const dataLoadingSubscription = combineLatest([
        loadingMinMax$,
        loadingHasNoResults$,
        dataControlManager.api.dataLoading$,
      ])
        .pipe(
          debounceTime(100),
          map((values) => values.some((value) => value))
        )
        .subscribe((isLoading) => {
          dataLoading$.next(isLoading);
        });

      // Clear state when the field changes
      const fieldChangedSubscription = combineLatest([
        dataControlManager.api.fieldName$,
        dataControlManager.api.dataViewId$,
      ])
        .pipe(skip(1))
        .subscribe(() => {
          editorStateManager.api.setStep(1);
          selections.setValue(undefined);
        });

      const controlFetch$ = fetch$({ uuid, parentApi });
      const max$ = new BehaviorSubject<number | undefined>(undefined);
      const min$ = new BehaviorSubject<number | undefined>(undefined);
      const minMaxSubscription = minMax$({
        controlFetch$,
        dataViews$: dataControlManager.api.dataViews$,
        fieldName$: dataControlManager.api.fieldName$,
        setIsLoading: (isLoading: boolean) => {
          // clear previous loading error on next loading start
          if (isLoading && dataControlManager.api.blockingError$.value) {
            dataControlManager.api.setBlockingError(undefined);
          }
          loadingMinMax$.next(isLoading);
        },
      }).subscribe(
        ({
          error,
          min,
          max,
        }: {
          error?: Error;
          min: number | undefined;
          max: number | undefined;
        }) => {
          if (error) {
            dataControlManager.api.setBlockingError(error);
          }
          max$.next(max !== undefined ? Math.ceil(max) : undefined);
          min$.next(min !== undefined ? Math.floor(min) : undefined);
        }
      );

      const outputFilterSubscription = combineLatest([
        dataControlManager.api.dataViews$,
        dataControlManager.api.fieldName$,
        selections.value$,
      ])
        .pipe(debounceTime(0))
        .subscribe(([dataViews, fieldName, value]) => {
          const dataView = dataViews?.[0];
          const dataViewField =
            dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;
          const gte = parseFloat(value?.[0] ?? '');
          const lte = parseFloat(value?.[1] ?? '');

          let rangeFilter: Filter | undefined;
          if (value && dataView && dataViewField && (!isNaN(gte) || !isNaN(lte))) {
            const params = {
              gte: !isNaN(gte) ? gte : -Infinity,
              lte: !isNaN(lte) ? lte : Infinity,
            } as RangeFilterParams;

            rangeFilter = buildRangeFilter(dataViewField, params, dataView);
            rangeFilter.meta.key = fieldName;
            rangeFilter.meta.type = 'range';
            rangeFilter.meta.params = params;
            rangeFilter.meta.controlledBy = uuid;
          }
          dataControlManager.internalApi.setOutputFilter(rangeFilter);
        });

      const selectionHasNoResults$ = new BehaviorSubject(false);
      const hasNotResultsSubscription = hasNoResults$({
        controlFetch$,
        dataViews$: dataControlManager.api.dataViews$,
        rangeFilters$: dataControlManager.api.appliedFilters$,
        setIsLoading: (isLoading: boolean) => {
          loadingHasNoResults$.next(isLoading);
        },
      }).subscribe((hasNoResults) => {
        selectionHasNoResults$.next(hasNoResults);
      });

      if (selections.hasInitialSelections) {
        await new Promise<void>((resolve) => {
          combineLatest([
            dataControlManager.api.blockingError$,
            dataControlManager.api.filtersLoading$,
          ])
            .pipe(
              first(
                ([blockingError, filtersLoading]) => !filtersLoading || blockingError !== undefined
              )
            )
            .subscribe(() => resolve());
        });
      }

      return {
        api,
        Component: () => {
          const [
            dataLoading,
            fieldFormatter,
            max,
            min,
            selectionHasNoResults,
            step,
            value,
            fieldName,
          ] = useBatchedPublishingSubjects(
            dataLoading$,
            dataControlManager.api.fieldFormatter,
            max$,
            min$,
            selectionHasNoResults$,
            editorStateManager.api.step$,
            selections.value$,
            dataControlManager.api.fieldName$
          );

          useEffect(() => {
            return () => {
              dataLoadingSubscription.unsubscribe();
              fieldChangedSubscription.unsubscribe();
              hasNotResultsSubscription.unsubscribe();
              minMaxSubscription.unsubscribe();
              outputFilterSubscription.unsubscribe();
            };
          }, []);

          return (
            <RangeSliderControl
              fieldName={fieldName}
              fieldFormatter={fieldFormatter}
              isInvalid={Boolean(value) && selectionHasNoResults}
              isLoading={typeof dataLoading === 'boolean' ? dataLoading : false}
              max={max}
              min={min}
              onChange={selections.setValue}
              step={step ?? 1}
              value={value}
              uuid={uuid}
              compressed={isCompressed(api)}
            />
          );
        },
      };
    },
  };
};
