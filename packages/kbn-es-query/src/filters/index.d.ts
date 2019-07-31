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

import { CustomFilter, ExistsFilter, PhraseFilter, PhrasesFilter, RangeFilter } from './lib';
import { RangeFilterParams } from './lib/range_filter';

export * from './lib';

// We can't import the real types from the data plugin, so need to either duplicate
// them here or figure out another solution, perhaps housing them in this package
type Field = any;
type IndexPattern = any;

export function buildExistsFilter(field: Field, indexPattern: IndexPattern): ExistsFilter;

export function buildPhraseFilter(
  field: Field,
  value: string,
  indexPattern: IndexPattern
): PhraseFilter;

export function buildPhrasesFilter(
  field: Field,
  values: string[],
  indexPattern: IndexPattern
): PhrasesFilter;

export function buildQueryFilter(query: any, index: string): CustomFilter;

export function buildRangeFilter(
  field: Field,
  params: RangeFilterParams,
  indexPattern: IndexPattern,
  formattedValue?: string
): RangeFilter;
