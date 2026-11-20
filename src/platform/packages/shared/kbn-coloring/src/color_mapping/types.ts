/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedValue } from '@kbn/data-plugin/common';

export interface ColorMappingInputCategoricalData {
  type: 'categories';
  /**
   * An **ordered** array of serialized categories rendered in the visualization
   */
  categories: SerializedValue[];
}

export interface ColorMappingInputContinuousData {
  type: 'ranges';
  min: number;
  max: number;
  bins: number;
}

/**
 * A configuration object that is required to populate correctly the visible categories
 * or the ranges in the CategoricalColorMapping component
 */
export type ColorMappingInputData =
  | ColorMappingInputCategoricalData
  | ColorMappingInputContinuousData;
