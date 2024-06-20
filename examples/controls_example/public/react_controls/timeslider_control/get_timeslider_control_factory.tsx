/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject, debounceTime, first, map } from 'rxjs';
import { EuiInputPopover } from '@elastic/eui';
import {
  apiHasParentApi,
  apiPublishesDataLoading,
  getViewModeSubject,
  useBatchedPublishingSubjects,
  ViewMode,
} from '@kbn/presentation-publishing';
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
        defaultMessage: 'Time slider',
      }),
    buildControl: (initialState, buildApi, uuid, controlGroupApi) => {
      const { timeRangeMeta$, formatDate, cleanupTimeRangeSubscription } =
        initTimeRangeSubscription(controlGroupApi, services);
      const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
      function syncTimesliceWithTimeRangePercentage(
        startPercentage: number | undefined,
        endPercentage: number | undefined
      ) {
        if (startPercentage === undefined || endPercentage === undefined) {
          if (timeslice$.value !== undefined) {
            timeslice$.next(undefined);
          }
          return;
        }

        const { stepSize, timeRange, timeRangeBounds } = timeRangeMeta$.value;
        const from = timeRangeBounds[FROM_INDEX] + startPercentage * timeRange;
        const to = timeRangeBounds[FROM_INDEX] + endPercentage * timeRange;
        timeslice$.next([
          roundDownToNextStepSizeFactor(from, stepSize),
          roundUpToNextStepSizeFactor(to, stepSize),
        ]);
        setSelectedRange(to - from);
      }
      const timeRangePercentage = initTimeRangePercentage(
        initialState,
        syncTimesliceWithTimeRangePercentage
      );
      function setTimeslice(timeslice?: Timeslice) {
        timeRangePercentage.setTimeRangePercentage(timeslice, timeRangeMeta$.value);
        timeslice$.next(timeslice);
      }
      const isAnchored$ = new BehaviorSubject<boolean | undefined>(initialState.isAnchored);
      function setIsAnchored(isAnchored: boolean | undefined) {
        isAnchored$.next(isAnchored);
      }
      let selectedRange: number | undefined;
      function setSelectedRange(nextSelectedRange?: number) {
        selectedRange =
          nextSelectedRange !== undefined && nextSelectedRange < timeRangeMeta$.value.timeRange
            ? nextSelectedRange
            : undefined;
      }

      function onChange(timeslice?: Timeslice) {
        setTimeslice(timeslice);
        const nextSelectedRange = timeslice
          ? timeslice[TO_INDEX] - timeslice[FROM_INDEX]
          : undefined;
        setSelectedRange(nextSelectedRange);
      }

      function onPrevious() {
        const { ticks, timeRangeMax, timeRangeMin } = timeRangeMeta$.value;
        const value = timeslice$.value;
        const tickRange = ticks[1].value - ticks[0].value;

        if (isAnchored$.value) {
          const prevTick = value
            ? [...ticks].reverse().find((tick) => {
                return tick.value < value[TO_INDEX];
              })
            : ticks[ticks.length - 1];
          setTimeslice([timeRangeMin, prevTick ? prevTick.value : timeRangeMax]);
          return;
        }

        if (value === undefined || value[FROM_INDEX] <= timeRangeMin) {
          const to = timeRangeMax;
          if (selectedRange === undefined || selectedRange === tickRange) {
            const lastTickValue = ticks[ticks.length - 1].value;
            const secondToLastTickValue = ticks[ticks.length - 2].value;
            const from = lastTickValue === to ? secondToLastTickValue : lastTickValue;
            setTimeslice([from, to]);
            setSelectedRange(tickRange);
          } else {
            const from = to - selectedRange;
            setTimeslice([Math.max(from, timeRangeMin), to]);
          }
          return;
        }

        const to = value[FROM_INDEX];
        const safeRange = selectedRange === undefined ? tickRange : selectedRange;
        const from = to - safeRange;
        setTimeslice([Math.max(from, timeRangeMin), to]);
      }

      function onNext() {
        const { ticks, timeRangeMax, timeRangeMin } = timeRangeMeta$.value;
        const value = timeslice$.value;
        const tickRange = ticks[1].value - ticks[0].value;

        if (isAnchored$.value) {
          if (value === undefined || value[TO_INDEX] >= timeRangeMax) {
            setTimeslice([timeRangeMin, ticks[0].value]);
            return;
          }

          const nextTick = ticks.find((tick) => {
            return tick.value > value[TO_INDEX];
          });
          setTimeslice([timeRangeMin, nextTick ? nextTick.value : timeRangeMax]);
          return;
        }

        if (value === undefined || value[TO_INDEX] >= timeRangeMax) {
          const from = timeRangeMin;
          if (selectedRange === undefined || selectedRange === tickRange) {
            const firstTickValue = ticks[0].value;
            const secondTickValue = ticks[1].value;
            const to = firstTickValue === from ? secondTickValue : firstTickValue;
            setTimeslice([from, to]);
            setSelectedRange(tickRange);
          } else {
            const to = from + selectedRange;
            setTimeslice([from, Math.min(to, timeRangeMax)]);
          }
          return;
        }

        const from = value[TO_INDEX];
        const safeRange = selectedRange === undefined ? tickRange : selectedRange;
        const to = from + safeRange;
        setTimeslice([from, Math.min(to, timeRangeMax)]);
      }

      const isPopoverOpen$ = new BehaviorSubject(false);
      function setIsPopoverOpen(value: boolean) {
        isPopoverOpen$.next(value);
      }
      const viewModeSubject =
        getViewModeSubject(controlGroupApi) ?? new BehaviorSubject('view' as ViewMode);

      const defaultControl = initializeDefaultControlApi(initialState);

      const dashboardDataLoading$ =
        apiHasParentApi(controlGroupApi) && apiPublishesDataLoading(controlGroupApi.parentApi)
          ? controlGroupApi.parentApi.dataLoading
          : new BehaviorSubject<boolean | undefined>(false);
      const waitForDashboardPanelsToLoad$ = dashboardDataLoading$.pipe(
        // debounce to give time for panels to start loading if they are going to load from time changes
        debounceTime(300),
        first((isLoading: boolean | undefined) => {
          return !isLoading;
        }),
        map(() => {
          // Observable notifies subscriber when loading is finished
          // Return void to not expose internal implementation details of observable
          return;
        })
      );

      const api = buildApi(
        {
          ...defaultControl.api,
          timeslice$,
          serializeState: () => {
            const { rawState: defaultControlState } = defaultControl.serialize();
            return {
              rawState: {
                ...defaultControlState,
                ...timeRangePercentage.serializeState(),
                isAnchored: isAnchored$.value,
              },
              references: [],
            };
          },
          CustomPrependComponent: () => {
            const [autoApplySelections, viewMode] = useBatchedPublishingSubjects(
              controlGroupApi.autoApplySelections$,
              viewModeSubject
            );

            return (
              <TimeSliderPrepend
                onNext={onNext}
                onPrevious={onPrevious}
                viewMode={viewMode}
                disablePlayButton={!autoApplySelections}
                setIsPopoverOpen={setIsPopoverOpen}
                waitForControlOutputConsumersToLoad$={waitForDashboardPanelsToLoad$}
              />
            );
          },
        },
        {
          ...defaultControl.comparators,
          ...timeRangePercentage.comparators,
          isAnchored: [isAnchored$, setIsAnchored],
        }
      );

      const timeRangeMetaSubscription = timeRangeMeta$.subscribe((timeRangeMeta) => {
        const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
          timeRangePercentage.serializeState();
        syncTimesliceWithTimeRangePercentage(
          timesliceStartAsPercentageOfTimeRange,
          timesliceEndAsPercentageOfTimeRange
        );
      });

      return {
        api,
        Component: (controlStyleProps) => {
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
              {...controlStyleProps}
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
                onChange={onChange}
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
