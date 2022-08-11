/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { timer } from 'rxjs';
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

    this.reduxEmbeddableTools = reduxEmbeddablePackage.createTools<
      TimeSliderReduxState,
      typeof timeSliderReducers
    >({
      embeddable: this,
      reducers: timeSliderReducers,
      initialComponentState: {
        timeRangeBounds: timefilter.calculateBounds(input.timeRange ? input.timeRange : getDefaultTimeRange()),
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
        dispatch(actions.setTimeRangeBounds({ timeRangeBounds: nextBounds }));
        const value = getState().explicitInput.value;
        // unset value when its not valid for next time bounds
        if (value && (value[0] < nextBounds[0] || value[1] > nextBounds[1])) {
          dispatch(actions.setValue({ value: undefined }));
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

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    const { Wrapper: TimeSliderControlReduxWrapper } = this.reduxEmbeddableTools;

    const mockWaitForPanelsToLoad$ = timer(3000, 3000);

    ReactDOM.render(
      <TimeSliderControlReduxWrapper>
        <TimeSlider dateFormat={this.getDateFormat()} timezone={this.getTimezone()} waitForPanelsToLoad$={mockWaitForPanelsToLoad$} />
      </TimeSliderControlReduxWrapper>,
      node
    );
  };
}
