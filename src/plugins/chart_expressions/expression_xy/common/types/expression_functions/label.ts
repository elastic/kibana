/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueBoxed } from '../../../../../expressions';
import type { Labels } from '../../../../../charts/public';

export type ExpressionValueLabel = ExpressionValueBoxed<
  'label',
  {
    color?: Labels['color'];
    filter?: Labels['filter'];
    overwriteColor?: Labels['overwriteColor'];
    rotate?: Labels['rotate'];
    show?: Labels['show'];
    truncate?: Labels['truncate'];
  }
>;

export type ExpressionValueLabelArguments = Labels;
