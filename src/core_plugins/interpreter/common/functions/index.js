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

import { alterColumn } from './alter_column';
import { all } from './all';
import { any } from './any';
import { asFn } from './as';
import { compare } from './compare';
import { context } from './context';
import { columns } from './columns';
import { csv } from './csv';
import { date } from './date';
import { doFn } from './do';
import { eq } from './eq';
import { exactly } from './exactly';
import { filterrows } from './filterrows';
import { font } from './font';
import { formatdate } from './formatdate';
import { formatnumber } from './formatnumber';
import { getCell } from './get_cell';
import { gt } from './gt';
import { gte } from './gte';
import { head } from './head';
import { ifFn } from './if';
import { lt } from './lt';
import { lte } from './lte';
import { mapColumn } from './map_column';
import { math } from './math';
import { neq } from './neq';
import { replace } from './replace';
import { rounddate } from './rounddate';
import { rowCount } from './row_count';
import { seriesStyle } from './series_style';
import { shape } from './shape';
import { sort } from './sort';
import { staticColumn } from './static_column';
import { string } from './string';
import { table } from './table';
import { tail } from './tail';
import { to } from './to';
import { switchFn } from './switch';
import { caseFn } from './case';

export const commonFunctions = [
  all,
  alterColumn,
  any,
  asFn,
  columns,
  compare,
  context,
  csv,
  date,
  doFn,
  eq,
  exactly,
  filterrows,
  font,
  formatdate,
  formatnumber,
  getCell,
  gt,
  gte,
  head,
  ifFn,
  lt,
  lte,
  mapColumn,
  math,
  neq,
  replace,
  rounddate,
  rowCount,
  seriesStyle,
  shape,
  sort,
  staticColumn,
  string,
  table,
  tail,
  to,
  switchFn,
  caseFn,
];
