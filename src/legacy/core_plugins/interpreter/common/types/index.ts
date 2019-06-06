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

// @ts-ignore
import { boolean } from './boolean';
// @ts-ignore
import { datatable } from './datatable';
// @ts-ignore
import { error } from './error';
// @ts-ignore
import { filter } from './filter';
// @ts-ignore
import { image } from './image';
// @ts-ignore
import { nullType } from './null';
// @ts-ignore
import { number } from './number';
// @ts-ignore
import { pointseries } from './pointseries';
// @ts-ignore
import { render } from './render';
// @ts-ignore
import { shape } from './shape';
// @ts-ignore
import { string } from './string';
// @ts-ignore
import { style } from './style';
import { kibanaContext } from './kibana_context';
import { kibanaDatatable } from './kibana_datatable';

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
  kibanaContext,
  kibanaDatatable,
];

export { KibanaContext } from './kibana_context';
export { KibanaDatatable } from './kibana_datatable';
