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

import { createUrlFormat } from '../../common/field_formats/types/url';
import { createBytesFormat } from '../../common/field_formats/types/bytes';
import { createDateOnServerFormat } from '../../common/field_formats/types/date_server';
import { createDateNanosFormat } from '../../common/field_formats/types/date_nanos';
import { createRelativeDateFormat } from '../../common/field_formats/types/relative_date';
import { createDurationFormat } from '../../common/field_formats/types/duration';
import { createIpFormat } from '../../common/field_formats/types/ip';
import { createNumberFormat } from '../../common/field_formats/types/number';
import { createPercentFormat } from '../../common/field_formats/types/percent';
import { createStringFormat } from '../../common/field_formats/types/string';
import { createSourceFormat } from '../../common/field_formats/types/source';
import { createColorFormat } from '../../common/field_formats/types/color';
import { createTruncateFormat } from '../../common/field_formats/types/truncate';
import { createBoolFormat } from '../../common/field_formats/types/boolean';
import { createStaticLookupFormat } from '../../common/field_formats/types/static_lookup';

export function registerFieldFormats(server) {
  server.registerFieldFormat(createUrlFormat);
  server.registerFieldFormat(createBytesFormat);
  server.registerFieldFormat(createDateOnServerFormat);
  server.registerFieldFormat(createDateNanosFormat);
  server.registerFieldFormat(createRelativeDateFormat);
  server.registerFieldFormat(createDurationFormat);
  server.registerFieldFormat(createIpFormat);
  server.registerFieldFormat(createNumberFormat);
  server.registerFieldFormat(createPercentFormat);
  server.registerFieldFormat(createStringFormat);
  server.registerFieldFormat(createSourceFormat);
  server.registerFieldFormat(createColorFormat);
  server.registerFieldFormat(createTruncateFormat);
  server.registerFieldFormat(createBoolFormat);
  server.registerFieldFormat(createStaticLookupFormat);
}
