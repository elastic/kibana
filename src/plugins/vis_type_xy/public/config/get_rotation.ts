/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Rotation } from '@elastic/charts';

import { CategoryAxis } from '../types';

export function getRotation({ position }: CategoryAxis): Rotation {
  if (position === 'left' || position === 'right') {
    return 90;
  }

  return 0;
}
