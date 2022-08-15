/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { timer } from 'rxjs';
import moment from 'moment-timezone';
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { ReduxEmbeddableTools, ReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { TIME_SLIDER_CONTROL } from '../..';
import { TimeSliderControlEmbeddableInput } from '../../../common/control_types/time_slider/types';
import { pluginServices } from '../../services';
import { ControlsSettingsService } from '../../services/settings';
import { ControlsDataService } from '../../services/data';
import { ControlOutput } from '../../types';
import { TimeSlider } from './components';
import { timeSliderReducers } from './time_slider_reducers';
import { TimeSliderReduxState } from './types';
import { getMomentTimezone, getTicks, getRange, FROM_INDEX, TO_INDEX } from './time_utils';

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

    const timeRangeBounds = timefilter.calculateBounds(input.timeRange ? input.timeRange : getDefaultTimeRange());

    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      TimeSliderReduxState,
      typeof timeSliderReducers
    >({
      embeddable: this,
      reducers: timeSliderReducers,
      initialComponentState: {
        ticks: getTicks(timeRangeBounds[FROM_INDEX], timeRangeBounds[TO_INDEX], getTimezone()),
        timeRangeBounds,
      }
    });

    this.inputSubscription = this.getInput$().subscribe(() => this.onInputChange());

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
    if (input.timeRange) {
      const timeRangeBounds = this.timefilter.calculateBounds(input.timeRange);
      const nextBounds = [timeRangeBounds.min.valueOf(), timeRangeBounds.max.valueOf()];
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
        }
      }
    }
  }

  private initialize() {
    const input = this.getInput();
    if (input.value) {
      const { actions, dispatch, getState } = this.reduxEmbeddableTools;
      dispatch(actions.publishValue({ value: input.value }));
    }
  }

  public reload() {
    return;
  }

  private debouncedPublishChange = _.debounce((value: [number, number]) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;
    dispatch(actions.publishValue({ value }));
  }, 500);

  private onTimesliceChange = (value?: [number, number]) => {
    const { actions, dispatch } = this.reduxEmbeddableTools;
    dispatch(actions.setValue({ value }));
    this.debouncedPublishChange(value);
  };

  private onNext = () => {
    const { actions, dispatch, getState } = this.reduxEmbeddableTools;
    const value = getState().explicitInput.value;
    const ticks = getState().componentState.ticks;
    const timeRangeBounds = getState().componentState.timeRangeBounds;
    const timeRangeMax = timeRangeBounds[TO_INDEX];
    const from = value === undefined || value[TO_INDEX] === timeRangeMax
      ? ticks[0].value
      : value[TO_INDEX];
    const range = getRange(timeRangeBounds, value);
    const to = from + range;
    this.onTimesliceChange([from, Math.min(to, timeRangeMax)]);
  };

  private onPrevious = () => {
    const { actions, dispatch, getState } = this.reduxEmbeddableTools;
    const value = getState().explicitInput.value;
    const ticks = getState().componentState.ticks;
    const timeRangeBounds = getState().componentState.timeRangeBounds;
    const timeRangeMin = timeRangeBounds[FROM_INDEX];
    const to = value === undefined || value[FROM_INDEX] === timeRangeMin
      ? ticks[ticks.length - 1].value
      : value[FROM_INDEX];
    const range = getRange(timeRangeBounds, value);
    const from = to - range;
    this.onTimesliceChange([Math.max(from, timeRangeMin), to]);
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

    const mockWaitForPanelsToLoad$ = timer(2000, 2000);

    ReactDOM.render(
      <TimeSliderControlReduxWrapper>
        <TimeSlider 
          formatDate={this.epochToKbnDateFormat}
          onChange={this.onTimesliceChange}
          onNext={this.onNext}
          onPrevious={this.onPrevious}
          waitForPanelsToLoad$={mockWaitForPanelsToLoad$}
        />
      </TimeSliderControlReduxWrapper>,
      node
    );
  };
}
