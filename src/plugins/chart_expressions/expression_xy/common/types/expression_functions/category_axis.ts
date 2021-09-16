/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueBoxed } from '../../../../../expressions';
import { CategoryAxis } from '../param';
import { ExpressionValueLabel } from './label';
import { ExpressionValueScale } from './value_scale';

export interface ExpressionValueCategoryAxisArguments
  extends Omit<CategoryAxis, 'title' | 'scale' | 'labels'> {
  title?: string;
  scale: ExpressionValueScale;
  labels: ExpressionValueLabel;
}

export type ExpressionValueCategoryAxis = ExpressionValueBoxed<
  'category_axis',
  {
    id: CategoryAxis['id'];
    show: CategoryAxis['show'];
    position: CategoryAxis['position'];
    axisType: CategoryAxis['type'];
    title: {
      text?: string;
    };
    labels: CategoryAxis['labels'];
    scale: CategoryAxis['scale'];
  }
>;
