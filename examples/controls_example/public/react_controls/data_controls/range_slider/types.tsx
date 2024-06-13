/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DataControlApi, DefaultDataControlState } from '../types';

export const RANGE_SLIDER_CONTROL_TYPE = 'rangeSlider';

export type RangeValue = [string, string];

export interface RangesliderControlState extends DefaultDataControlState {
  value?: RangeValue;
  step?: number;
}

export type RangesliderControlApi = DataControlApi;

export interface Services {
  core: CoreStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}
