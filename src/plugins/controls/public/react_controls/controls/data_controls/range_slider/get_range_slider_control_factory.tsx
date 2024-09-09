/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { buildRangeFilter, Filter, RangeFilterParams } from '@kbn/es-query';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, debounceTime, map, skip } from 'rxjs';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory, DataControlServices } from '../types';
import { RangeSliderControl } from './components/range_slider_control';
import { hasNoResults$ } from './has_no_results';
import { minMax$ } from './min_max';
import { RangeSliderStrings } from './range_slider_strings';
import { RangesliderControlApi, RangesliderControlState } from './types';
import { initializeRangeControlSelections } from './range_control_selections';
import { RANGE_SLIDER_CONTROL } from '../../../../../common';

export const getRangesliderControlFactory = (
  services: DataControlServices
): DataControlFactory<RangesliderControlState, RangesliderControlApi> => {
  return {
    type: RANGE_SLIDER_CONTROL,
    getIconType: () => 'controlsHorizontal',
    getDisplayName: RangeSliderStrings.control.getDisplayName,
    isFieldCompatible: (field) => {
      return field.aggregatable && field.type === 'number';
    },
    CustomOptionsComponent: ({ initialState, updateState, setControlEditorValid }) => {
      const [step, setStep] = useState(initialState.step ?? 1);

      return (
        <>
          <EuiFormRow fullWidth label={RangeSliderStrings.editor.getStepTitle()}>
            <EuiFieldNumber
              value={step}
              onChange={(event) => {
                const newStep = event.target.valueAsNumber;
                setStep(newStep);
                updateState({ step: newStep });
                setControlEditorValid(newStep > 0);
              }}
              min={0}
              isInvalid={step === undefined || step <= 0}
              data-test-subj="rangeSliderControl__stepAdditionalSetting"
            />
          </EuiFormRow>
        </>
      );
    },
    buildControl: async (initialState, buildApi, uuid, controlGroupApi) => {
      const controlFetch$ = controlGroupApi.controlFetch$(uuid);
      const loadingMinMax$ = new BehaviorSubject<boolean>(false);
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
      const step$ = new BehaviorSubject<number | undefined>(initialState.step ?? 1);

      const dataControl = initializeDataControl<Pick<RangesliderControlState, 'step'>>(
        uuid,
        RANGE_SLIDER_CONTROL,
        'rangeSliderDataView',
        initialState,
        {
          step: step$,
        },
        controlGroupApi,
        services
      );

      const selections = initializeRangeControlSelections(
        initialState,
        dataControl.setters.onSelectionChange
      );

      const api = buildApi(
        {
          ...dataControl.api,
          dataLoading: dataLoading$,
          getTypeDisplayName: RangeSliderStrings.control.getDisplayName,
          serializeState: () => {
            const { rawState: dataControlState, references } = dataControl.serialize();
            return {
              rawState: {
                ...dataControlState,
                step: step$.getValue(),
                value: selections.value$.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            selections.setValue(undefined);
          },
        },
        {
          ...dataControl.comparators,
          ...selections.comparators,
          step: [
            step$,
            (nextStep: number | undefined) => step$.next(nextStep),
            (a, b) => (a ?? 1) === (b ?? 1),
          ],
        }
      );

      const dataLoadingSubscription = combineLatest([loadingMinMax$, loadingHasNoResults$])
        .pipe(
          map((values) => {
            return values.some((value) => {
              return value;
            });
          })
        )
        .subscribe((isLoading) => {
          dataLoading$.next(isLoading);
        });

      // Clear state when the field changes
      const fieldChangedSubscription = combineLatest([
        dataControl.stateManager.fieldName,
        dataControl.stateManager.dataViewId,
      ])
        .pipe(skip(1))
        .subscribe(() => {
          step$.next(1);
          selections.setValue(undefined);
        });

      const max$ = new BehaviorSubject<number | undefined>(undefined);
      const min$ = new BehaviorSubject<number | undefined>(undefined);
      const minMaxSubscription = minMax$({
        controlFetch$,
        data: services.data,
        dataViews$: dataControl.api.dataViews,
        fieldName$: dataControl.stateManager.fieldName,
        setIsLoading: (isLoading: boolean) => {
          // clear previous loading error on next loading start
          if (isLoading && dataControl.api.blockingError.value) {
            dataControl.api.setBlockingError(undefined);
          }
          loadingMinMax$.next(isLoading);
        },
        controlGroupApi,
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
            dataControl.api.setBlockingError(error);
          }
          max$.next(max !== undefined ? Math.ceil(max) : undefined);
          min$.next(min !== undefined ? Math.floor(min) : undefined);
        }
      );

      const outputFilterSubscription = combineLatest([
        dataControl.api.dataViews,
        dataControl.stateManager.fieldName,
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
          if (value && dataView && dataViewField && !isNaN(gte) && !isNaN(lte)) {
            const params = {
              gte,
              lte,
            } as RangeFilterParams;

            rangeFilter = buildRangeFilter(dataViewField, params, dataView);
            rangeFilter.meta.key = fieldName;
            rangeFilter.meta.type = 'range';
            rangeFilter.meta.params = params;
          }
          dataControl.setters.setOutputFilter(rangeFilter);
        });

      const selectionHasNoResults$ = new BehaviorSubject(false);
      const hasNotResultsSubscription = hasNoResults$({
        controlFetch$,
        data: services.data,
        dataViews$: dataControl.api.dataViews,
        rangeFilters$: dataControl.api.filters$,
        ignoreParentSettings$: controlGroupApi.ignoreParentSettings$,
        setIsLoading: (isLoading: boolean) => {
          loadingHasNoResults$.next(isLoading);
        },
      }).subscribe((hasNoResults) => {
        selectionHasNoResults$.next(hasNoResults);
      });

      if (selections.hasInitialSelections) {
        await dataControl.api.untilFiltersReady();
      }

      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
          const [dataLoading, fieldFormatter, max, min, selectionHasNotResults, step, value] =
            useBatchedPublishingSubjects(
              dataLoading$,
              dataControl.api.fieldFormatter,
              max$,
              min$,
              selectionHasNoResults$,
              step$,
              selections.value$
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
              controlPanelClassName={controlPanelClassName}
              fieldFormatter={fieldFormatter}
              isInvalid={selectionHasNotResults}
              isLoading={typeof dataLoading === 'boolean' ? dataLoading : false}
              max={max}
              min={min}
              onChange={selections.setValue}
              step={step ?? 1}
              value={value}
              uuid={uuid}
            />
          );
        },
      };
    },
  };
};
