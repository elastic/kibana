/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { EmbeddableInput } from '@kbn/embeddable-plugin/common/types';
import { ControlStyle } from './control_group/types';

export type TimeSlice = [number, number];

export interface ParentIgnoreSettings {
  ignoreFilters?: boolean;
  ignoreQuery?: boolean;
  ignoreTimerange?: boolean;
  ignoreValidations?: boolean;
}

export type ControlInput = EmbeddableInput & {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  timeslice?: TimeSlice;
  controlStyle?: ControlStyle;
  ignoreParentSettings?: ParentIgnoreSettings;
};

export type DataControlInput = ControlInput & {
  fieldName: string;
  dataViewId: string;
};

export type ControlInputTransform = (
  newState: Partial<ControlInput>,
  controlType: string
) => Partial<ControlInput>;

export type { ControlStyle, ControlWidth } from './control_group/types';
