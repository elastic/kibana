/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import {
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { buildRangeFilter, Filter, RangeFilterParams } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import {
  RangesliderControlApi,
  RangesliderControlState,
  RangeValue,
  RANGE_SLIDER_CONTROL_TYPE,
  Services,
} from './types';
import { RangeSliderStrings } from './range_slider_strings';
import { RangeSliderControl } from './components/range_slider_control';
import { minMax$ } from './min_max';
import { hasNoResults$ } from './has_no_results';
import { DataControlFetchContext } from '../../control_group/types';

export const getRangesliderControlFactory = (
  services: Services
): DataControlFactory<RangesliderControlState, RangesliderControlApi> => {
  return {
    type: RANGE_SLIDER_CONTROL_TYPE,
    getIconType: () => 'controlsHorizontal',
    getDisplayName: RangeSliderStrings.control.getDisplayName,
    isFieldCompatible: (field) => {
      return field.aggregatable && field.type === 'number';
    },
    CustomOptionsComponent: ({ stateManager, setControlEditorValid }) => {
      const step = useStateFromPublishingSubject(stateManager.step);

      return (
        <>
          <EuiFormRow fullWidth label={RangeSliderStrings.editor.getStepTitle()}>
            <EuiFieldNumber
              value={step}
              onChange={(event) => {
                const newStep = event.target.valueAsNumber;
                stateManager.step.next(newStep);
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
    buildControl: (initialState, buildApi, uuid, controlGroupApi) => {
      const loadingMinMax$ = new BehaviorSubject<boolean>(false);
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
      const step$ = new BehaviorSubject<number | undefined>(initialState.step);
      const value$ = new BehaviorSubject<RangeValue | undefined>(initialState.value);
      function setValue(nextValue: RangeValue | undefined) {
        value$.next(nextValue);
      }

      const dataControl = initializeDataControl<Pick<RangesliderControlState, 'step' | 'value'>>(
        uuid,
        RANGE_SLIDER_CONTROL_TYPE,
        initialState,
        {
          step: step$,
          value: value$,
        },
        controlGroupApi,
        services
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
                value: value$.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            value$.next(undefined);
          },
        },
        {
          ...dataControl.comparators,
          step: [step$, (nextStep: number | undefined) => step$.next(nextStep)],
          value: [value$, setValue],
        }
      );

      const dataControlFetch$ = controlGroupApi.dataControlFetch$.pipe(
        map((context: DataControlFetchContext) => {
          // remove this controls filter from context
          // TODO remove once dataControlFetch$ propertly passes chained filters
          const rangeFilter = dataControl.api.filters$?.value?.[0];
          return context.filters && rangeFilter
            ? {
                ...context,
                filters: context.filters.filter((filter) => {
                  return (
                    !isEqual(rangeFilter.meta, filter.meta) ||
                    !isEqual(rangeFilter.query, filter.query)
                  );
                }),
              }
            : context;
        })
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
        .pipe(distinctUntilChanged(deepEqual))
        .subscribe(() => {
          step$.next(1);
          value$.next(undefined);
        });

      const max$ = new BehaviorSubject<number | undefined>(undefined);
      const min$ = new BehaviorSubject<number | undefined>(undefined);
      const minMaxSubscription = minMax$({
        data: services.data,
        dataControlFetch$,
        dataViews$: dataControl.api.dataViews,
        fieldName$: dataControl.stateManager.fieldName,
        setIsLoading: (isLoading: boolean) => {
          // clear previous loading error on next loading start
          if (isLoading && dataControl.api.blockingError.value) {
            dataControl.api.setBlockingError(undefined);
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
            dataControl.api.setBlockingError(error);
          }
          max$.next(max);
          min$.next(min);
        }
      );

      const valueSubscription = value$.subscribe((value) => {
        const dataView = dataControl.api.dataViews?.value?.[0];
        const fieldName = dataControl.stateManager.fieldName.value;
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
        api.setOutputFilter(rangeFilter);
      });

      const selectionHasNoResults$ = new BehaviorSubject(false);
      const hasNotResultsSubscription = hasNoResults$({
        data: services.data,
        dataViews$: dataControl.api.dataViews,
        filters$: dataControl.api.filters$,
        ignoreParentSettings$: controlGroupApi.ignoreParentSettings$,
        dataControlFetch$,
        setIsLoading: (isLoading: boolean) => {
          loadingHasNoResults$.next(isLoading);
        },
      }).subscribe((hasNoResults) => {
        selectionHasNoResults$.next(hasNoResults);
      });

      return {
        api,
        Component: () => {
          const [dataLoading, dataViews, fieldName, max, min, selectionHasNotResults, step, value] =
            useBatchedPublishingSubjects(
              dataLoading$,
              dataControl.api.dataViews,
              dataControl.stateManager.fieldName,
              max$,
              min$,
              selectionHasNoResults$,
              step$,
              value$
            );

          useEffect(() => {
            return () => {
              dataLoadingSubscription.unsubscribe();
              fieldChangedSubscription.unsubscribe();
              hasNotResultsSubscription.unsubscribe();
              minMaxSubscription.unsubscribe();
              valueSubscription.unsubscribe();
            };
          }, []);

          const fieldFormatter = useMemo(() => {
            const dataView = dataViews?.[0];
            if (!dataView) {
              return undefined;
            }
            const fieldSpec = dataView.getFieldByName(fieldName);
            return fieldSpec
              ? dataView.getFormatterForField(fieldSpec).getConverterFor('text')
              : undefined;
          }, [dataViews, fieldName]);

          return (
            <RangeSliderControl
              fieldFormatter={fieldFormatter}
              isInvalid={selectionHasNotResults}
              isLoading={typeof dataLoading === 'boolean' ? dataLoading : false}
              max={max}
              min={min}
              onChange={setValue}
              step={step}
              value={value}
              uuid={uuid}
            />
          );
        },
      };
    },
  };
};
