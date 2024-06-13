/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest, distinctUntilChanged } from 'rxjs';

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import {
  RangesliderControlApi,
  RangesliderControlState,
  RangeValue,
  RANGE_SLIDER_CONTROL_TYPE,
} from './types';
import { RangeSliderStrings } from './range_slider_strings';

export const getRangesliderControlFactory = ({
  core,
  dataViewsService,
}: {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
}): DataControlFactory<RangesliderControlState, RangesliderControlApi> => {
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
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      const step$ = new BehaviorSubject<number | undefined>(initialState.step);
      const value$ = new BehaviorSubject<RangeValue | undefined>(initialState.value);
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
        parentApi,
        {
          core,
          dataViews: dataViewsService,
        }
      );

      const api = buildApi(
        {
          ...dataControlApi,
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
          step: [
            step$,
            (nextStep: number | undefined) =>
            step$.next(nextStep),
          ],
          value: [
            value$,
            (nextValue: RangeValue | undefined) =>
              value$.next(nextValue),
          ],
        }
      );

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

      return {
        api,
        Component: () => {
          useEffect(() => {
            return () => {
              fieldChangedSubscription.unsubscribe();
            };
          }, []);

          return (
            <div>Range slider placeholder</div>
          );
        },
      };
    },
  };
};
