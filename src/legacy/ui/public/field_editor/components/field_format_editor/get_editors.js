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

import { BytesFormatEditor } from './editors/bytes';
import { ColorFormatEditor } from './editors/color';
import { CurrencyFormatEditor } from './editors/currency';
import { DateFormatEditor } from './editors/date';
import { DateNanosFormatEditor } from './editors/date_nanos';
import { DefaultNumberFormatEditor } from './editors/default_number';
import { CustomNumberFormatEditor } from './editors/number';
import { DurationFormatEditor } from './editors/duration';
import { LargeNumberFormatEditor } from './editors/large_number';
import { PercentFormatEditor } from './editors/percent';
import { StaticLookupFormatEditor } from './editors/static_lookup';
import { StringFormatEditor } from './editors/string';
import { TruncateFormatEditor } from './editors/truncate';
import { UrlFormatEditor } from './editors/url/url';

export const editors = [
  BytesFormatEditor,
  ColorFormatEditor,
  CurrencyFormatEditor,
  DateFormatEditor,
  DateNanosFormatEditor,
  CustomNumberFormatEditor,
  DefaultNumberFormatEditor,
  DurationFormatEditor,
  LargeNumberFormatEditor,
  PercentFormatEditor,
  StaticLookupFormatEditor,
  StringFormatEditor,
  TruncateFormatEditor,
  UrlFormatEditor,
];
