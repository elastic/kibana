/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, map, merge, skip } from 'rxjs';

import type { Filter, RangeFilterParams } from '@kbn/es-query';
import { buildRangeFilter } from '@kbn/es-query';
import {
  apiPublishesViewMode,
  fetch$,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';

import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
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
import type { RangeSliderControlApi } from './types';
import { editorComparators, initializeEditorStateManager } from './editor_state_manager';

export const getRangesliderControlFactory = (): EmbeddableFactory<
  RangeSliderControlState,
  RangeSliderControlApi
> => {
  return {
    type: RANGE_SLIDER_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);

      const editorStateManager = initializeEditorStateManager(state);

      const dataControlManager = await initializeDataControlManager<
        Pick<RangeSliderControlState, 'step'>
      >({
        controlId: uuid,
        controlType: RANGE_SLIDER_CONTROL,
        typeDisplayName: RangeSliderStrings.control.getDisplayName(),
        state,
        parentApi,
        editorStateManager,
      });

      const selections = initializeRangeControlSelections(
        state,
        dataControlManager.internalApi.onSelectionChange
      );

      // If there are no initial selections, the min/max values will be displayed initially in the control.
      // Therefore, make sure the control is initially in a loading state
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(
        !selections.hasInitialSelections
      );
      const loadingMinMax$ = new BehaviorSubject<boolean>(!selections.hasInitialSelections);

      function serializeState() {
        return {
          rawState: {
            ...dataControlManager.getLatestState(),
            ...editorStateManager.getLatestState(),
            value: selections.value$.getValue(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<RangeSliderControlState>({
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

      const viewMode$ = apiPublishesViewMode(parentApi)
        ? parentApi.viewMode$
        : new BehaviorSubject<boolean>(true);

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
            viewMode,
          ] = useBatchedPublishingSubjects(
            dataLoading$,
            dataControlManager.api.fieldFormatter,
            max$,
            min$,
            selectionHasNoResults$,
            editorStateManager.api.step$,
            selections.value$,
            dataControlManager.api.fieldName$,
            viewMode$
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
              isEdit={viewMode === 'edit'}
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
