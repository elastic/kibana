/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { debounceTime, first, map } from 'rxjs/operators';
import moment from 'moment-timezone';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableTools, ReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { TIME_SLIDER_CONTROL } from '../..';
import { TimeSliderControlEmbeddableInput } from '../../../common/time_slider/types';
import { pluginServices } from '../../services';
import { ControlsSettingsService } from '../../services/settings/types';
import { ControlsDataService } from '../../services/data/types';
import { ControlOutput } from '../../types';
import { ControlGroupContainer } from '../../control_group/embeddable/control_group_container';
import { TimeSlider, TimeSliderPrepend } from '../components';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import {
  getMomentTimezone,
  getStepSize,
  getTicks,
  FROM_INDEX,
  TO_INDEX,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
} from '../time_utils';
import { getIsAnchored, getRoundedTimeRangeBounds } from '../time_slider_selectors';

export class TimeSliderControlEmbeddable extends Embeddable<
  TimeSliderControlEmbeddableInput,
  ControlOutput
> {
  public readonly type = TIME_SLIDER_CONTROL;
  public deferEmbeddedLoad = true;

  private inputSubscription: Subscription;
  private node?: HTMLElement;

  private getTimezone: ControlsSettingsService['getTimezone'];
  private timefilter: ControlsDataService['timefilter'];
  private prevTimeRange: TimeRange | undefined;
  private prevTimesliceAsPercentage: {
    timesliceStartAsPercentageOfTimeRange?: number;
    timesliceEndAsPercentageOfTimeRange?: number;
  };
  private readonly waitForControlOutputConsumersToLoad$;

  private reduxEmbeddableTools: ReduxEmbeddableTools<
    TimeSliderReduxState,
    typeof timeSliderReducers
  >;

  constructor(
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    input: TimeSliderControlEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent);

    const {
      data: { timefilter },
      settings: { getDefaultTimeRange, getTimezone },
    } = pluginServices.getServices();

    this.getTimezone = getTimezone;
    this.timefilter = timefilter;

    const timeRangeBounds = this.timeRangeToBounds(
      input.timeRange ? input.timeRange : getDefaultTimeRange()
    );
    const ticks = getTicks(
      timeRangeBounds[FROM_INDEX],
      timeRangeBounds[TO_INDEX],
      this.getTimezone()
    );
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      TimeSliderReduxState,
      typeof timeSliderReducers
    >({
      embeddable: this,
      reducers: timeSliderReducers,
      initialComponentState: {
        isOpen: false,
        ...getStepSize(ticks),
        ticks,
        timeRangeBounds,
      },
    });

    this.inputSubscription = this.getInput$().subscribe(() => this.onInputChange());

    this.waitForControlOutputConsumersToLoad$ =
      parent && 'anyControlOutputConsumerLoading$' in (parent as ControlGroupContainer)
        ? (parent as ControlGroupContainer).anyControlOutputConsumerLoading$.pipe(
            debounceTime(300),
            first((isAnyControlOutputConsumerLoading: boolean) => {
              return !isAnyControlOutputConsumerLoading;
            }),
            map(() => {
              // Observable notifies subscriber when loading is finished
              // Return void to not expose internal implemenation details of observabale
              return;
            })
          )
        : undefined;

    this.prevTimesliceAsPercentage = {
      timesliceStartAsPercentageOfTimeRange: this.getInput().timesliceStartAsPercentageOfTimeRange,
      timesliceEndAsPercentageOfTimeRange: this.getInput().timesliceEndAsPercentageOfTimeRange,
    };
    this.syncWithTimeRange();
  }

  public destroy = () => {
    super.destroy();
    this.reduxEmbeddableTools.cleanup();
    if (this.inputSubscription) {
      this.inputSubscription.unsubscribe();
    }
  };

  private onInputChange() {
    const input = this.getInput();
    const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
      this.prevTimesliceAsPercentage ?? {};

    const { actions, dispatch } = this.reduxEmbeddableTools;
    if (
      timesliceStartAsPercentageOfTimeRange !== input.timesliceStartAsPercentageOfTimeRange ||
      timesliceEndAsPercentageOfTimeRange !== input.timesliceEndAsPercentageOfTimeRange
    ) {
      // Discarding edit mode changes results in replacing edited input with original input
      // Re-sync with time range when edited input timeslice changes are discarded
      if (
        !input.timesliceStartAsPercentageOfTimeRange &&
        !input.timesliceEndAsPercentageOfTimeRange
      ) {
        // If no selections have been saved into the timeslider, then both `timesliceStartAsPercentageOfTimeRange`
        // and `timesliceEndAsPercentageOfTimeRange` will be undefined - so, need to reset component state to match
        dispatch(actions.publishValue({ value: undefined }));
        dispatch(actions.setValue({ value: undefined }));
      } else {
        // Otherwise, need to call `syncWithTimeRange` so that the component state value can be calculated and set
        this.syncWithTimeRange();
      }
    } else if (input.timeRange && !_.isEqual(input.timeRange, this.prevTimeRange)) {
      const nextBounds = this.timeRangeToBounds(input.timeRange);
      const ticks = getTicks(nextBounds[FROM_INDEX], nextBounds[TO_INDEX], this.getTimezone());
      dispatch(
        actions.setTimeRangeBounds({
          ...getStepSize(ticks),
          ticks,
          timeRangeBounds: nextBounds,
        })
      );
      this.syncWithTimeRange();
    }
  }

  private syncWithTimeRange() {
    this.prevTimeRange = this.getInput().timeRange;
    const { actions, dispatch, getState } = this.reduxEmbeddableTools;
    const stepSize = getState().componentState.stepSize;
    const timesliceStartAsPercentageOfTimeRange =
      getState().explicitInput.timesliceStartAsPercentageOfTimeRange;
    const timesliceEndAsPercentageOfTimeRange =
      getState().explicitInput.timesliceEndAsPercentageOfTimeRange;

    if (
      timesliceStartAsPercentageOfTimeRange !== undefined &&
      timesliceEndAsPercentageOfTimeRange !== undefined
    ) {
      const timeRangeBounds = getState().componentState.timeRangeBounds;
      const timeRange = timeRangeBounds[TO_INDEX] - timeRangeBounds[FROM_INDEX];
      const from = timeRangeBounds[FROM_INDEX] + timesliceStartAsPercentageOfTimeRange * timeRange;
      const to = timeRangeBounds[FROM_INDEX] + timesliceEndAsPercentageOfTimeRange * timeRange;
      const value = [
        roundDownToNextStepSizeFactor(from, stepSize),
        roundUpToNextStepSizeFactor(to, stepSize),
      ] as [number, number];
      dispatch(actions.publishValue({ value }));
      dispatch(actions.setValue({ value }));
      this.onRangeChange(value[TO_INDEX] - value[FROM_INDEX]);
    }
  }

  private timeRangeToBounds(timeRange: TimeRange): [number, number] {
    const timeRangeBounds = this.timefilter.calculateBounds(timeRange);
    return timeRangeBounds.min === undefined || timeRangeBounds.max === undefined
      ? [Date.now() - 1000 * 60 * 15, Date.now()]
      : [timeRangeBounds.min.valueOf(), timeRangeBounds.max.valueOf()];
  }

  public reload() {
    return;
  }

  private debouncedPublishChange = _.debounce((value?: [number, number]) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;
    dispatch(actions.publishValue({ value }));
  }, 500);

  private getTimeSliceAsPercentageOfTimeRange(value?: [number, number]) {
    const { getState } = this.reduxEmbeddableTools;
    let timesliceStartAsPercentageOfTimeRange: number | undefined;
    let timesliceEndAsPercentageOfTimeRange: number | undefined;
    if (value) {
      const timeRangeBounds = getState().componentState.timeRangeBounds;
      const timeRange = timeRangeBounds[TO_INDEX] - timeRangeBounds[FROM_INDEX];
      timesliceStartAsPercentageOfTimeRange =
        (value[FROM_INDEX] - timeRangeBounds[FROM_INDEX]) / timeRange;
      timesliceEndAsPercentageOfTimeRange =
        (value[TO_INDEX] - timeRangeBounds[FROM_INDEX]) / timeRange;
    }
    this.prevTimesliceAsPercentage = {
      timesliceStartAsPercentageOfTimeRange,
      timesliceEndAsPercentageOfTimeRange,
    };
    return { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange };
  }

  private onTimesliceChange = (value?: [number, number]) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;

    const { timesliceStartAsPercentageOfTimeRange, timesliceEndAsPercentageOfTimeRange } =
      this.getTimeSliceAsPercentageOfTimeRange(value);
    dispatch(
      actions.setValueAsPercentageOfTimeRange({
        timesliceStartAsPercentageOfTimeRange,
        timesliceEndAsPercentageOfTimeRange,
      })
    );
    dispatch(actions.setValue({ value }));
    this.debouncedPublishChange(value);
  };

  private onRangeChange = (range?: number) => {
    const { actions, dispatch, getState } = this.reduxEmbeddableTools;
    const timeRangeBounds = getState().componentState.timeRangeBounds;
    const timeRange = timeRangeBounds[TO_INDEX] - timeRangeBounds[FROM_INDEX];
    dispatch(
      actions.setRange({
        range: range !== undefined && range < timeRange ? range : undefined,
      })
    );
  };

  private onNext = () => {
    const { getState } = this.reduxEmbeddableTools;
    const value = getState().componentState.value;
    const range = getState().componentState.range;
    const ticks = getState().componentState.ticks;
    const isAnchored = getIsAnchored(getState());
    const tickRange = ticks[1].value - ticks[0].value;
    const timeRangeBounds = getRoundedTimeRangeBounds(getState());

    if (isAnchored) {
      if (value === undefined || value[TO_INDEX] >= timeRangeBounds[TO_INDEX]) {
        this.onTimesliceChange([timeRangeBounds[FROM_INDEX], ticks[0].value]);
        return;
      }

      const nextTick = ticks.find((tick) => {
        return tick.value > value[TO_INDEX];
      });
      this.onTimesliceChange([
        timeRangeBounds[FROM_INDEX],
        nextTick ? nextTick.value : timeRangeBounds[TO_INDEX],
      ]);
      return;
    }

    if (value === undefined || value[TO_INDEX] >= timeRangeBounds[TO_INDEX]) {
      const from = timeRangeBounds[FROM_INDEX];
      if (range === undefined || range === tickRange) {
        const firstTickValue = ticks[0].value;
        const secondTickValue = ticks[1].value;
        const to = firstTickValue === from ? secondTickValue : firstTickValue;
        this.onTimesliceChange([from, to]);
        this.onRangeChange(tickRange);
      } else {
        const to = from + range;
        this.onTimesliceChange([from, Math.min(to, timeRangeBounds[TO_INDEX])]);
      }
      return;
    }

    const from = value[TO_INDEX];
    const safeRange = range === undefined ? tickRange : range;
    const to = from + safeRange;
    this.onTimesliceChange([from, Math.min(to, timeRangeBounds[TO_INDEX])]);
  };

  private onPrevious = () => {
    const { getState } = this.reduxEmbeddableTools;
    const value = getState().componentState.value;
    const range = getState().componentState.range;
    const ticks = getState().componentState.ticks;
    const isAnchored = getIsAnchored(getState());
    const tickRange = ticks[1].value - ticks[0].value;
    const timeRangeBounds = getRoundedTimeRangeBounds(getState());

    if (isAnchored) {
      const prevTick = value
        ? [...ticks].reverse().find((tick) => {
            return tick.value < value[TO_INDEX];
          })
        : ticks[ticks.length - 1];
      this.onTimesliceChange([
        timeRangeBounds[FROM_INDEX],
        prevTick ? prevTick.value : timeRangeBounds[TO_INDEX],
      ]);
      return;
    }

    if (value === undefined || value[FROM_INDEX] <= timeRangeBounds[FROM_INDEX]) {
      const to = timeRangeBounds[TO_INDEX];
      if (range === undefined || range === tickRange) {
        const lastTickValue = ticks[ticks.length - 1].value;
        const secondToLastTickValue = ticks[ticks.length - 2].value;
        const from = lastTickValue === to ? secondToLastTickValue : lastTickValue;
        this.onTimesliceChange([from, to]);
        this.onRangeChange(tickRange);
      } else {
        const from = to - range;
        this.onTimesliceChange([Math.max(from, timeRangeBounds[FROM_INDEX]), to]);
      }
      return;
    }

    const to = value[FROM_INDEX];
    const safeRange = range === undefined ? tickRange : range;
    const from = to - safeRange;
    this.onTimesliceChange([Math.max(from, timeRangeBounds[FROM_INDEX]), to]);
  };

  private formatDate = (epoch: number) => {
    const { getState } = this.reduxEmbeddableTools;
    return moment
      .tz(epoch, getMomentTimezone(this.getTimezone()))
      .format(getState().componentState.format);
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const { Wrapper: TimeSliderControlReduxWrapper } = this.reduxEmbeddableTools;

    ReactDOM.render(
      <KibanaThemeProvider theme$={pluginServices.getServices().theme.theme$}>
        <TimeSliderControlReduxWrapper>
          <TimeSlider
            formatDate={this.formatDate}
            onChange={(value?: [number, number]) => {
              this.onTimesliceChange(value);
              const range = value ? value[TO_INDEX] - value[FROM_INDEX] : undefined;
              this.onRangeChange(range);
            }}
          />
        </TimeSliderControlReduxWrapper>
      </KibanaThemeProvider>,
      node
    );
  };

  public renderPrepend() {
    const { Wrapper: TimeSliderControlReduxWrapper } = this.reduxEmbeddableTools;
    return (
      <TimeSliderControlReduxWrapper>
        <TimeSliderPrepend
          onNext={this.onNext}
          onPrevious={this.onPrevious}
          waitForControlOutputConsumersToLoad$={this.waitForControlOutputConsumersToLoad$}
        />
      </TimeSliderControlReduxWrapper>
    );
  }

  public isChained() {
    return false;
  }
}
