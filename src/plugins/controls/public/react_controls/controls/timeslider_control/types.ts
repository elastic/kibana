/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { PublishesPanelTitle, PublishesTimeslice } from '@kbn/presentation-publishing';
import type { DefaultControlApi, DefaultControlState } from '../types';

export type Timeslice = [number, number];

export interface TimesliderControlState extends DefaultControlState {
  isAnchored?: boolean;
  // Encode value as percentage of time range to support relative time ranges.
  timesliceStartAsPercentageOfTimeRange?: number;
  timesliceEndAsPercentageOfTimeRange?: number;
}

export type TimesliderControlApi = DefaultControlApi &
  Pick<PublishesPanelTitle, 'defaultPanelTitle'> &
  PublishesTimeslice;

export interface Services {
  core: CoreStart;
  data: DataPublicPluginStart;
}
