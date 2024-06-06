/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ControlFactory } from '../types';
import { TimesliderControlState, TimesliderControlApi, TIMESLIDER_CONTROL_TYPE } from './types';
import { BehaviorSubject } from 'rxjs';
import { initializeDefaultControlApi } from '../initialize_default_control_api';

export const timesliderControlFactory: ControlFactory<TimesliderControlState, TimesliderControlApi> = {
  type: TIMESLIDER_CONTROL_TYPE,
  getIconType: () => 'search',
  getDisplayName: () =>
    i18n.translate('controlsExamples.timesliderControl.displayName', { defaultMessage: 'Time slider' }),
  buildControl: (initialState, buildApi, uuid, parentApi) => {
    const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
    const isAnchored$ = new BehaviorSubject<boolean | undefined>(undefined);
    const timesliceStartAsPercentageOfTimeRange$ = new BehaviorSubject<number | undefined>(undefined);
    const timesliceEndAsPercentageOfTimeRange$ = new BehaviorSubject<number | undefined>(undefined);
    const {
      defaultControlApi,
      defaultControlComparators,
      serializeDefaultControl,
    } = initializeDefaultControlApi(initialState);
    const api = buildApi(
      {
        ...defaultControlApi,
        timeslice$,
        serializeState: () => {
          const { rawState: defaultControlState } = serializeDefaultControl();
          return {
            rawState: {
              ...defaultControlState,
              isAnchored: isAnchored$.value,
              timesliceStartAsPercentageOfTimeRange: timesliceStartAsPercentageOfTimeRange$.value,
              timesliceEndAsPercentageOfTimeRange: timesliceEndAsPercentageOfTimeRange$.value
            },
            references: [],
          };
        }
      },
      {
        ...defaultControlComparators,
        isAnchored: [
          isAnchored$,
          (value) => {
            isAnchored$.next(value);
          }
        ],
        timesliceStartAsPercentageOfTimeRange: [
          timesliceStartAsPercentageOfTimeRange$,
          (value) => {
            timesliceStartAsPercentageOfTimeRange$.next(value);
          }
        ],
        timesliceEndAsPercentageOfTimeRange: [
          timesliceEndAsPercentageOfTimeRange$,
          (value) => {
            timesliceEndAsPercentageOfTimeRange$.next(value);
          }
        ],
      }
    );

    return {
      api,
      Component: () => {
        return (
          <div>timeslider control placeholder</div>
        );
      },
    };
  },
};
