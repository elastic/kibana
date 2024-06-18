/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, switchMap, tap } from 'rxjs';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { buildRangeFilter, Filter, RangeFilterParams } from '@kbn/es-query';
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
import { getMinMax } from './get_min_max';

export const getRangesliderControlFactory = (
  services: Services
): DataControlFactory<RangesliderControlState, RangesliderControlApi> => {
  return {
    type: RANGE_SLIDER_CONTROL_TYPE,
    getIconType: () => 'controlsHorizontal',
    getDisplayName: RangeSliderStrings.control.getDisplayName,
    isFieldCompatible: (field) => {
      // TODO check for number field
      return true;
    },
    CustomOptionsComponent: ({ stateManager, setControlEditorValid }) => {
      const [step] = useBatchedPublishingSubjects(stateManager.step);

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
      const loadingValidation$ = new BehaviorSubject<boolean>(false);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
      const step$ = new BehaviorSubject<number | undefined>(initialState.step);
      const value$ = new BehaviorSubject<RangeValue | undefined>(initialState.value);
      function setValue(nextValue: RangeValue | undefined) {
        value$.next(nextValue);
      }
      const stateManager = {
        step: step$,
        value: value$,
      };

      const {
        dataControlApi,
        dataControlComparators,
        dataControlStateManager,
        serializeDataControl,
      } = initializeDataControl<Pick<RangesliderControlState, 'step' | 'value'>>(
        uuid,
        RANGE_SLIDER_CONTROL_TYPE,
        initialState,
        stateManager,
        controlGroupApi,
        services
      );

      const api = buildApi(
        {
          ...dataControlApi,
          dataLoading: dataLoading$,
          getTypeDisplayName: RangeSliderStrings.control.getDisplayName,
          serializeState: () => {
            const { rawState: dataControlState, references } = serializeDataControl();
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
          ...dataControlComparators,
          step: [step$, (nextStep: number | undefined) => step$.next(nextStep)],
          value: [value$, setValue],
        }
      );

      const dataLoadingSubscription = combineLatest([
        loadingMinMax$,
        loadingValidation$
      ])
        .pipe(
          map((values) => {
            return values.some((value) => {
              return value;
            });
          })
        )
        .subscribe(isLoading => {
          dataLoading$.next(isLoading);
        });

      // Clear state when the field changes
      const fieldChangedSubscription = combineLatest([
        dataControlStateManager.fieldName,
        dataControlStateManager.dataViewId,
      ])
        .pipe(distinctUntilChanged(deepEqual))
        .subscribe(() => {
          step$.next(1);
          value$.next(undefined);
        });

      const max$ = new BehaviorSubject<number | undefined>(undefined);
      const min$ = new BehaviorSubject<number | undefined>(undefined);
      let prevRequestAbortController: AbortController | undefined;
      const minMaxSubscription = combineLatest([
        dataControlApi.dataViews,
        dataControlStateManager.fieldName,
        controlGroupApi.dataControlFetch$,
      ])
        .pipe(
          tap(() => {
            if (prevRequestAbortController) {
              prevRequestAbortController.abort();
            }
          }),
          switchMap(async ([dataViews, fieldName, dataControlFetchContext]) => {
            dataControlApi.setBlockingError(undefined);
            const dataView = dataViews?.[0];
            const dataViewField =
              dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;
            if (!dataView || !dataViewField) {
              return { max: undefined, min: undefined };
            }

            try {
              loadingMinMax$.next(true);
              const abortController = new AbortController();
              prevRequestAbortController = abortController;
              return await getMinMax({
                abortSignal: abortController.signal,
                data: services.data,
                dataView,
                field: dataViewField,
                ...dataControlFetchContext,
              });
            } catch (error) {
              return { error };
            }
          })
        )
        .subscribe((next) => {
          loadingMinMax$.next(false);
          max$.next(
            next?.hasOwnProperty('max') ? (next as { max: number | undefined }).max : undefined
          );
          min$.next(
            next?.hasOwnProperty('min') ? (next as { min: number | undefined }).min : undefined
          );
          if (next?.hasOwnProperty('error')) {
            dataControlApi.setBlockingError((next as { error: Error | undefined }).error);
          }
        });

      const outputFilterSubscription = value$.subscribe((value) => {
        const dataView = dataControlApi.dataViews?.value?.[0];
        const fieldName = dataControlStateManager.fieldName.value;
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

      const isInvalidSubscription = combineLatest([
        dataControlApi.filters$,
        controlGroupApi.ignoreParentSettings,
        controlGroupApi.dataControlFetch$,
      ]).subscribe(([filters, ignoreParentSettings, dataControlFetchContext]) => {
        /*if (!filters || filters.length === 0 || ignoreParentSettings?.ignoreValidations) {
          isInvalid$.next(false);
        }*/

        // TODO fetch validation... that the selected range has results

      });

      return {
        api,
        Component: () => {
          const [dataLoading, dataViews, fieldName, max, min, step, value] =
            useBatchedPublishingSubjects(
              dataControlApi.dataLoading,
              dataControlApi.dataViews,
              dataControlStateManager.fieldName,
              max$,
              min$,
              step$,
              value$
            );

          useEffect(() => {
            return () => {
              dataLoadingSubscription.unsubscribe();
              fieldChangedSubscription.unsubscribe();
              isInvalidSubscription.unsubscribe();
              minMaxSubscription.unsubscribe();
              outputFilterSubscription.unsubscribe();
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
              isInvalid={false}
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
