/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { boolean } from './boolean';
import { datatable } from './datatable';
import { error } from './error';
import { filter } from './filter';
import { image } from './image';
import { nullType } from './null';
import { num } from './num';
import { number } from './number';
import { pointseries } from './pointseries';
import { range } from './range';
import { render } from './render';
import { shape } from './shape';
import { string } from './string';
import { style } from './style';
import { AnyExpressionTypeDefinition } from '../types';
import { uiSetting } from './ui_setting';

export const typeSpecs: AnyExpressionTypeDefinition[] = [
  boolean,
  datatable,
  error,
  filter,
  image,
  nullType,
  num,
  number,
  pointseries,
  range,
  render,
  shape,
  string,
  style,
  uiSetting,
];

export * from './boolean';
export * from './datatable';
export * from './error';
export * from './filter';
export * from './image';
export * from './null';
export * from './num';
export * from './number';
export * from './pointseries';
export * from './range';
export * from './render';
export * from './shape';
export * from './string';
export * from './style';
export * from './ui_setting';
