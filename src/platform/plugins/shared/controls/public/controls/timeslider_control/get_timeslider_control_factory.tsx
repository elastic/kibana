/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject, debounceTime, first, map, merge, pairwise } from 'rxjs';

import { EuiInputPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PublishingSubject, ViewMode } from '@kbn/presentation-publishing';
import {
  apiPublishesDataLoading,
  getViewModeSubject,
  useBatchedPublishingSubjects,
  apiPublishesSettings,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { TimeSlice, TimeSliderControlState } from '@kbn/controls-schemas';
import { TimeSliderPopoverButton } from './components/time_slider_popover_button';
import { TimeSliderPopoverContent } from './components/time_slider_popover_content';
import { TimeSliderPrepend } from './components/time_slider_prepend';
import {
  initTimeRangePercentage,
  timeRangePercentageComparators,
} from './init_time_range_percentage';
import { initTimeRangeSubscription } from './init_time_range_subscription';
import {
  FROM_INDEX,
  TO_INDEX,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
} from './time_utils';
import type { TimeSliderControlApi } from './types';
import { isCompressed } from '../../control_group/utils/is_compressed';

const displayName = i18n.translate('controls.timesliderControl.displayName', {
  defaultMessage: 'Time slider',
});

export const getTimesliderControlFactory = (): EmbeddableFactory<
  TimeSliderControlState,
  TimeSliderControlApi
> => {
  return {
    type: TIME_SLIDER_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState;
      const { timeRangeMeta$, formatDate, cleanupTimeRangeSubscription } =
        initTimeRangeSubscription(parentApi);
      const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
      const isAnchored$ = new BehaviorSubject<boolean | undefined>(state.isAnchored);
      const isPopoverOpen$ = new BehaviorSubject(false);
      const hasTimeSliceSelection$ = new BehaviorSubject<boolean>(Boolean(timeslice$));

      const timeRangePercentage = initTimeRangePercentage(
        state,
        syncTimesliceWithTimeRangePercentage
      );

      function getTimesliceSyncedWithTimeRangePercentage(
        startPercentage: number,
        endPercentage: number
      ): [number, number] {
        const { stepSize, timeRange, timeRangeBounds } = timeRangeMeta$.value;
        const from = timeRangeBounds[FROM_INDEX] + startPercentage * timeRange;
        const to = timeRangeBounds[FROM_INDEX] + endPercentage * timeRange;
        return [
          roundDownToNextStepSizeFactor(from, stepSize),
          roundUpToNextStepSizeFactor(to, stepSize),
        ];
      }

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

        const { timeRange, timeRangeBounds } = timeRangeMeta$.value;

        const from = timeRangeBounds[FROM_INDEX] + startPercentage * timeRange;
        const to = timeRangeBounds[FROM_INDEX] + endPercentage * timeRange;
        timeslice$.next(getTimesliceSyncedWithTimeRangePercentage(startPercentage, endPercentage));
        setSelectedRange(to - from);
      }

      function setTimeslice(timeslice?: TimeSlice) {
        timeRangePercentage.setTimeRangePercentage(timeslice, timeRangeMeta$.value);
        const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
          timeRangePercentage.getLatestState();

        if (
          timesliceStartAsPercentageOfTimeRange !== undefined &&
          timesliceEndAsPercentageOfTimeRange !== undefined
        ) {
          timeslice$.next(
            getTimesliceSyncedWithTimeRangePercentage(
              timesliceStartAsPercentageOfTimeRange,
              timesliceEndAsPercentageOfTimeRange
            )
          );
        } else {
          timeslice$.next(undefined);
        }
      }

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

      function onChange(timeslice?: TimeSlice) {
        hasTimeSliceSelection$.next(Boolean(timeslice));
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

      const viewModeSubject =
        getViewModeSubject(parentApi) ?? new BehaviorSubject('view' as ViewMode);

      const dashboardDataLoading$ = apiPublishesDataLoading(parentApi)
        ? parentApi.dataLoading$
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

      function serializeState() {
        return {
          ...timeRangePercentage.getLatestState(),
          isAnchored: isAnchored$.value,
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<TimeSliderControlState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          timeRangePercentage.anyStateChange$,
          isAnchored$.pipe(map(() => undefined))
        ),
        getComparators: () => {
          return {
            ...timeRangePercentageComparators,
            width: 'skip',
            isAnchored: 'skip',
          };
        },
        onReset: (lastSaved) => {
          timeRangePercentage.reinitializeState(lastSaved);
          setIsAnchored(lastSaved?.isAnchored);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        isPinnable: false, // Disable the user-facing unpin action; panel can still be pinned programatically when it's created
        defaultTitle$: new BehaviorSubject<string | undefined>(displayName),
        appliedTimeslice$: timeslice$,
        serializeState,
        clearSelections: () => {
          setTimeslice(undefined);
          hasTimeSliceSelection$.next(false);
        },
        hasSelections$: hasTimeSliceSelection$ as PublishingSubject<boolean | undefined>,
        CustomPrependComponent: () => {
          const autoApplyFiltersSubject = apiPublishesSettings(parentApi)
            ? parentApi.settings.autoApplyFilters$
            : new BehaviorSubject<boolean>(true);
          const [autoApplyFilters, viewMode] = useBatchedPublishingSubjects(
            autoApplyFiltersSubject,
            viewModeSubject
          );

          return (
            <TimeSliderPrepend
              onNext={onNext}
              onPrevious={onPrevious}
              viewMode={viewMode}
              disablePlayButton={!autoApplyFilters}
              setIsPopoverOpen={(value) => isPopoverOpen$.next(value)}
              waitForControlOutputConsumersToLoad$={waitForDashboardPanelsToLoad$}
            />
          );
        },
      });

      const timeRangeMetaSubscription = timeRangeMeta$
        .pipe(pairwise())
        .subscribe(
          ([
            { timeRange: prevTimeRangeLength, stepSize: prevStepSize },
            { timeRange: nextTimeRangeLength, stepSize: nextStepSize },
          ]) => {
            // If auto apply filters is disabled, only sync the timeslice if the user has actually changed the timeRange.
            // This prevents the timeslice from getting shifted forward immediately after applying the filters
            // when using a relative time range, thus triggering another dirty state that needs to be applied.
            // Doing a simple check of nextTimeRangeLength !== prevTimeRangeLength will give us a false positive
            // if the relative timerange is set to "round to the nearest," which is why we compare the change to the
            // step size.
            const timeRangeHasChanged =
              nextStepSize !== prevStepSize ||
              Math.abs(nextTimeRangeLength - prevTimeRangeLength) > nextStepSize;
            if (
              apiPublishesSettings(parentApi) &&
              !parentApi.settings.autoApplyFilters$.value &&
              !timeRangeHasChanged
            )
              return;

            const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
              timeRangePercentage.getLatestState();
            syncTimesliceWithTimeRangePercentage(
              timesliceStartAsPercentageOfTimeRange,
              timesliceEndAsPercentageOfTimeRange
            );
          }
        );

      // Initialize the timeslice
      syncTimesliceWithTimeRangePercentage(
        state.timesliceStartAsPercentageOfTimeRange,
        state.timesliceEndAsPercentageOfTimeRange
      );

      return {
        api,
        Component: (controlPanelClassNames) => {
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
          const value: TimeSlice = useMemo(() => {
            return [from, to];
          }, [from, to]);

          const styles = useMemoCss({
            popover: css`
              width: 100%;
              height: 100%;
              max-inline-size: 100%;
            `,
          });

          return (
            <EuiInputPopover
              {...controlPanelClassNames}
              css={styles.popover}
              input={
                <TimeSliderPopoverButton
                  onClick={() => {
                    isPopoverOpen$.next(!isPopoverOpen);
                  }}
                  formatDate={formatDate}
                  from={from}
                  to={to}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={() => isPopoverOpen$.next(false)}
              panelPaddingSize="s"
              data-control-id={uuid}
            >
              <TimeSliderPopoverContent
                isAnchored={typeof isAnchored === 'boolean' ? isAnchored : false}
                setIsAnchored={setIsAnchored}
                value={value}
                onChange={onChange}
                stepSize={timeRangeMeta.stepSize}
                ticks={timeRangeMeta.ticks}
                timeRangeMin={timeRangeMeta.timeRangeMin}
                timeRangeMax={timeRangeMeta.timeRangeMax}
                compressed={isCompressed(api)}
              />
            </EuiInputPopover>
          );
        },
      };
    },
  };
};
