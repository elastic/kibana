/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boolean } from './boolean';
import { datatable } from './datatable';
import { error } from './error';
import { filter } from './filter';
import { image } from './image';
import { nullType } from './null';
import { number } from './number';
import { pointseries } from './pointseries';
import { render } from './render';
import { shape } from './shape';
import { string } from './string';
import { style } from './style';

export const typeSpecs = [
  boolean,
  datatable,
  error,
  filter,
  image,
  number,
  nullType,
  pointseries,
  render,
  shape,
  string,
  style,
];
