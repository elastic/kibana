/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, Query } from '@kbn/es-query';
import { TimeRange } from '../../data/common';
import { EmbeddableInput } from '../../embeddable/common/types';

export type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

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
  controlStyle?: ControlStyle;
  ignoreParentSettings?: ParentIgnoreSettings;
};
