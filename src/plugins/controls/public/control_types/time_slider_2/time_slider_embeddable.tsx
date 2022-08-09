/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { TIME_SLIDER_CONTROL } from '../..';
import { TimeSliderControlEmbeddableInput } from '../../../common/control_types/time_slider/types';
import { pluginServices } from '../../services';
import { ControlsSettingsService } from '../../services/settings';
import { ControlOutput } from '../../types';
import { TimeSlider as TimeSliderComponent } from './time_slider';

export class TimeSliderControlEmbeddable extends Embeddable<
  TimeSliderControlEmbeddableInput,
  ControlOutput
> {
  public readonly type = TIME_SLIDER_CONTROL;
  public deferEmbeddedLoad = true;

  private subscriptions: Subscription = new Subscription();
  private node?: HTMLElement;

  private getDateFormat: ControlsSettingsService['getDateFormat'];
  private getTimezone: ControlsSettingsService['getTimezone'];

  constructor(
    reduxEmbeddablePackage: ReduxEmbeddablePackage,
    input: TimeSliderControlEmbeddableInput,
    output: ControlOutput,
    parent?: IContainer
  ) {
    super(input, output, parent);

    const {
      settings: { getDateFormat, getTimezone },
    } = pluginServices.getServices();

    this.getDateFormat = getDateFormat;
    this.getTimezone = getTimezone;

    this.initialize();
  }

  private initialize() {
    return;
  }

  public reload() {
    return;
  }

  public render = (node: HTMLElement) => {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    ReactDOM.render(
      <TimeSliderComponent dateFormat={this.getDateFormat()} timezone={this.getTimezone()} />,
      node
    );
  };
}
