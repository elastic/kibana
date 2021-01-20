/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BaseVisTypeOptions } from '../../../visualizations/public';
import { ChartType } from '../../common';

import { VisParams } from './param';

export type VisTypeNames = ChartType | 'horizontal_bar';

export type XyVisTypeDefinition = BaseVisTypeOptions<VisParams> & {
  name: VisTypeNames;
  visConfig: {
    defaults: Omit<VisParams, 'dimensions'>;
  };
};
