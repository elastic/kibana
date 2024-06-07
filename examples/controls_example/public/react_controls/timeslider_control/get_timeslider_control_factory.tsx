/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { EuiInputPopover } from '@elastic/eui';
import { getViewModeSubject, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ControlFactory } from '../types';
import {
  TimesliderControlState,
  TimesliderControlApi,
  TIMESLIDER_CONTROL_TYPE,
  Services,
  Timeslice,
} from './types';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { TimeSliderPopoverButton } from './components/time_slider_popover_button';
import { TimeSliderPopoverContent } from './components/time_slider_popover_content';
import { initTimeRangeSubscription } from './init_time_range_subscription';
import {
  FROM_INDEX,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
  TO_INDEX,
} from './time_utils';
import { initTimeRangePercentage } from './init_time_range_percentage';
import './components/index.scss';
import { TimeSliderPrepend } from './components/time_slider_prepend';

export const getTimesliderControlFactory = (
  services: Services
): ControlFactory<TimesliderControlState, TimesliderControlApi> => {
  return {
    type: TIMESLIDER_CONTROL_TYPE,
    getIconType: () => 'search',
    getDisplayName: () =>
      i18n.translate('controlsExamples.timesliderControl.displayName', {
        defaultMessage: 'Timeslider',
      }),
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      const { timeRangeMeta$, formatDate, cleanupTimeRangeSubscription } =
        initTimeRangeSubscription(parentApi, services);
      const timeRangePercentage = initTimeRangePercentage(initialState);
      const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
      function setTimeslice(timeslice?: Timeslice) {
        timeRangePercentage.setTimeRangePercentage(timeslice, timeRangeMeta$.value);
        timeslice$.next(timeslice);
      }
      const isAnchored$ = new BehaviorSubject<boolean | undefined>(undefined);
      function setIsAnchored(isAnchored: boolean | undefined) {
        isAnchored$.next(isAnchored);
      }

      const isPopoverOpen$ = new BehaviorSubject(false);
      function setIsPopoverOpen(value: boolean) {
        isPopoverOpen$.next(value);
      }

      const { defaultControlApi, defaultControlComparators, serializeDefaultControl } =
        initializeDefaultControlApi(initialState);

      const api = buildApi(
        {
          ...defaultControlApi,
          timeslice$,
          serializeState: () => {
            const { rawState: defaultControlState } = serializeDefaultControl();
            return {
              rawState: {
                ...defaultControlState,
                ...timeRangePercentage.serializeState(),
                isAnchored: isAnchored$.value,
              },
              references: [],
            };
          },
          getCustomPrepend: () => {
            return (
              <TimeSliderPrepend
                onNext={() => {}}
                onPrevious={() => {}}
                viewModeSubject={getViewModeSubject(parentApi) ?? new BehaviorSubject('view')}
                disablePlayButton={false}
                setIsPopoverOpen={setIsPopoverOpen}
              />
            );
          }
        },
        {
          ...defaultControlComparators,
          ...timeRangePercentage.comparators,
          isAnchored: [isAnchored$, setIsAnchored],
        }
      );

      const timeRangeMetaSubscription = timeRangeMeta$.subscribe((timeRangeMeta) => {
        const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
          timeRangePercentage.serializeState();
        if (
          timesliceStartAsPercentageOfTimeRange === undefined ||
          timesliceEndAsPercentageOfTimeRange === undefined
        ) {
          if (timeslice$.value !== undefined) {
            timeslice$.next(undefined);
          }
          return;
        }

        const from =
          timeRangeMeta.timeRangeBounds[FROM_INDEX] +
          timesliceStartAsPercentageOfTimeRange * timeRangeMeta.timeRange;
        const to =
          timeRangeMeta.timeRangeBounds[FROM_INDEX] +
          timesliceEndAsPercentageOfTimeRange * timeRangeMeta.timeRange;
        timeslice$.next([
          roundDownToNextStepSizeFactor(from, timeRangeMeta.stepSize),
          roundUpToNextStepSizeFactor(to, timeRangeMeta.stepSize),
        ]);
      });

      return {
        api,
        Component: () => {
          const [isAnchored, isPopoverOpen, timeRangeMeta, timeslice] =
            useBatchedPublishingSubjects(isAnchored$, isPopoverOpen$, timeRangeMeta$, timeslice$);

          useEffect(() => {
            return () => {
              cleanupTimeRangeSubscription();
              timeRangeMetaSubscription.unsubscribe();
            };
          }, []);

          const from = useMemo(() => {
            return timeslice ? timeslice[FROM_INDEX] : timeRangeMeta.timeRangeMin;
          }, [timeslice, timeRangeMeta.timeRangeMin]);
          const to = useMemo(() => {
            return timeslice ? timeslice[TO_INDEX] : timeRangeMeta.timeRangeMax;
          }, [timeslice, timeRangeMeta.timeRangeMax]);

          return (
            <EuiInputPopover
              className="timeSlider__popoverOverride"
              panelClassName="timeSlider__panelOverride"
              input={
                <TimeSliderPopoverButton
                  onClick={() => {
                    setIsPopoverOpen(!isPopoverOpen);
                  }}
                  formatDate={formatDate}
                  from={from}
                  to={to}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="s"
            >
              <TimeSliderPopoverContent
                isAnchored={typeof isAnchored === 'boolean' ? isAnchored : false}
                setIsAnchored={setIsAnchored}
                value={[from, to]}
                onChange={setTimeslice}
                stepSize={timeRangeMeta.stepSize}
                ticks={timeRangeMeta.ticks}
                timeRangeMin={timeRangeMeta.timeRangeMin}
                timeRangeMax={timeRangeMeta.timeRangeMax}
              />
            </EuiInputPopover>
          );
        },
      };
    },
  };
};
