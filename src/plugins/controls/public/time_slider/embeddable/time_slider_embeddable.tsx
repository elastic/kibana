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
import { getMomentTimezone, getTicks, FROM_INDEX, TO_INDEX } from '../time_utils';

export class TimeSliderControlEmbeddable extends Embeddable<
  TimeSliderControlEmbeddableInput,
  ControlOutput
> {
  public readonly type = TIME_SLIDER_CONTROL;
  public deferEmbeddedLoad = true;

  private inputSubscription: Subscription;
  private node?: HTMLElement;

  private getDateFormat: ControlsSettingsService['getDateFormat'];
  private getTimezone: ControlsSettingsService['getTimezone'];
  private timefilter: ControlsDataService['timefilter'];
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
      settings: { getDateFormat, getDefaultTimeRange, getTimezone },
    } = pluginServices.getServices();

    this.getDateFormat = getDateFormat;
    this.getTimezone = getTimezone;
    this.timefilter = timefilter;

    const timeRangeBounds = this.timeRangeToBounds(
      input.timeRange ? input.timeRange : getDefaultTimeRange()
    );
    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      TimeSliderReduxState,
      typeof timeSliderReducers
    >({
      embeddable: this,
      reducers: timeSliderReducers,
      initialComponentState: {
        isOpen: false,
        ticks: getTicks(timeRangeBounds[FROM_INDEX], timeRangeBounds[TO_INDEX], this.getTimezone()),
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

    this.initialize();
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

    if (!input.timeRange) {
      return;
    }

    const nextBounds = this.timeRangeToBounds(input.timeRange);
    const { actions, dispatch, getState } = this.reduxEmbeddableTools;
    if (!_.isEqual(nextBounds, getState().componentState.timeRangeBounds)) {
      dispatch(
        actions.setTimeRangeBounds({
          ticks: getTicks(nextBounds[FROM_INDEX], nextBounds[TO_INDEX], this.getTimezone()),
          timeRangeBounds: nextBounds,
        })
      );
      const value = getState().explicitInput.value;
      // unset value when its not valid for next time bounds
      if (value && (value[0] < nextBounds[0] || value[1] > nextBounds[1])) {
        this.onTimesliceChange();
        this.onRangeChange();
      }
    }
  }

  private initialize() {
    const input = this.getInput();
    if (input.value) {
      const { actions, dispatch } = this.reduxEmbeddableTools;
      dispatch(actions.publishValue({ value: input.value }));
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

  private onTimesliceChange = (value?: [number, number]) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;
    dispatch(actions.setValue({ value }));
    this.debouncedPublishChange(value);
  };

  private onRangeChange = (range?: number) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;
    dispatch(actions.setRange({ range }));
  };

  private onNext = () => {
    const { getState } = this.reduxEmbeddableTools;
    const value = getState().explicitInput.value;
    const range = getState().componentState.range;
    const ticks = getState().componentState.ticks;
    const tickRange = ticks[1].value - ticks[0].value;
    const timeRangeBounds = getState().componentState.timeRangeBounds;

    if (value === undefined || value[TO_INDEX] >= timeRangeBounds[TO_INDEX]) {
      const from = timeRangeBounds[FROM_INDEX];
      if (range === undefined || range === tickRange) {
        const to = ticks[0].value;
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
    const value = getState().explicitInput.value;
    const range = getState().componentState.range;
    const ticks = getState().componentState.ticks;
    const tickRange = ticks[1].value - ticks[0].value;
    const timeRangeBounds = getState().componentState.timeRangeBounds;

    if (value === undefined || value[FROM_INDEX] <= timeRangeBounds[FROM_INDEX]) {
      const to = timeRangeBounds[TO_INDEX];
      if (range === undefined || range === tickRange) {
        const from = ticks[ticks.length - 1].value;
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

  private epochToKbnDateFormat = (epoch: number) => {
    return moment.tz(epoch, getMomentTimezone(this.getTimezone())).format(this.getDateFormat());
  };

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const { Wrapper: TimeSliderControlReduxWrapper } = this.reduxEmbeddableTools;

    ReactDOM.render(
      <TimeSliderControlReduxWrapper>
        <TimeSlider
          formatDate={this.epochToKbnDateFormat}
          onChange={(value?: [number, number]) => {
            this.onTimesliceChange(value);
            if (value) {
              const range = value[TO_INDEX] - value[FROM_INDEX];
              this.onRangeChange(range);
            }
          }}
        />
      </TimeSliderControlReduxWrapper>,
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
