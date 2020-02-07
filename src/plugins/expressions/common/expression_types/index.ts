/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { boolean } from './boolean';
import { datatable } from './datatable';
import { error } from './error';
import { filter } from './filter';
import { image } from './image';
import { kibanaContext } from './kibana_context';
import { kibanaDatatable } from './kibana_datatable';
import { nullType } from './null';
import { number } from './number';
import { pointseries } from './pointseries';
import { range } from './range';
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
  kibanaContext,
  kibanaDatatable,
  nullType,
  number,
  pointseries,
  range,
  render,
  shape,
  string,
  style,
];

export * from './boolean';
export * from './datatable';
export * from './error';
export * from './filter';
export * from './image';
export * from './kibana_context';
export * from './kibana_datatable';
export * from './null';
export * from './number';
export * from './pointseries';
export * from './range';
export * from './render';
export * from './shape';
export * from './string';
export * from './style';
