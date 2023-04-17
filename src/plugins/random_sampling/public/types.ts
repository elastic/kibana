/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import type { ControlSliderProps } from './ui/slider_control';
import { RandomSamplingIconProps } from './ui/icon/sampling_icon';

/**
 * Random Sampling plugin prewired UI components
 */
export interface RandomSamplingPublicPluginStartUi {
  ControlSlider: (props: ControlSliderProps) => React.ReactElement;
  SamplingIcon: (props: RandomSamplingIconProps) => React.ReactElement;
}

/**
 * Random Sampling plugin public Start contract
 */
export interface RandomSamplingPublicPluginStart {
  /**
   * prewired UI components
   * {@link RandomSamplingPublicPluginStartUi}
   */
  ui: RandomSamplingPublicPluginStartUi;
}

export type IRandomSamplingPluginServices = Partial<CoreStart>;
