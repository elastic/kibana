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

import { UrlFormat } from '../../common/field_formats/types/url';
import { BytesFormat } from '../../common/field_formats/types/bytes';
import { DateFormat } from '../../common/field_formats/types/date_server';
import { DateNanosFormat } from '../../common/field_formats/types/date_nanos';
import { RelativeDateFormat } from '../../common/field_formats/types/relative_date';
import { DurationFormat } from '../../common/field_formats/types/duration';
import { IpFormat } from '../../common/field_formats/types/ip';
import { NumberFormat } from '../../common/field_formats/types/number';
import { PercentFormat } from '../../common/field_formats/types/percent';
import { StringFormat } from '../../common/field_formats/types/string';
import { SourceFormat } from '../../common/field_formats/types/source';
import { ColorFormat } from '../../common/field_formats/types/color';
import { TruncateFormat } from '../../common/field_formats/types/truncate';
import { BoolFormat } from '../../common/field_formats/types/boolean';
import { StaticLookupFormat } from '../../common/field_formats/types/static_lookup';

export function registerFieldFormats(server) {
  server.registerFieldFormat(UrlFormat);
  server.registerFieldFormat(BytesFormat);
  server.registerFieldFormat(DateFormat);
  server.registerFieldFormat(DateNanosFormat);
  server.registerFieldFormat(RelativeDateFormat);
  server.registerFieldFormat(DurationFormat);
  server.registerFieldFormat(IpFormat);
  server.registerFieldFormat(NumberFormat);
  server.registerFieldFormat(PercentFormat);
  server.registerFieldFormat(StringFormat);
  server.registerFieldFormat(SourceFormat);
  server.registerFieldFormat(ColorFormat);
  server.registerFieldFormat(TruncateFormat);
  server.registerFieldFormat(BoolFormat);
  server.registerFieldFormat(StaticLookupFormat);
}
