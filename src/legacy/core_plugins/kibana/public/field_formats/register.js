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

import { fieldFormats } from 'ui/registry/field_formats';
import { UrlFormat } from '../../../../../plugins/data/common/field_formats/converters/url';
import { BytesFormat } from '../../../../../plugins/data/common/field_formats/converters/bytes';
import { DateFormat } from '../../../../../plugins/data/common/field_formats/converters/date';
import { DateNanosFormat } from '../../../../../plugins/data/common/field_formats/converters/date_nanos';
import { RelativeDateFormat } from '../../../../../plugins/data/common/field_formats/converters/relative_date';
import { DurationFormat } from '../../../../../plugins/data/common/field_formats/converters/duration';
import { IpFormat } from '../../../../../plugins/data/common/field_formats/converters/ip';
import { NumberFormat } from '../../../../../plugins/data/common/field_formats/converters/number';
import { PercentFormat } from '../../../../../plugins/data/common/field_formats/converters/percent';
import { StringFormat } from '../../../../../plugins/data/common/field_formats/converters/string';
import { SourceFormat } from '../../../../../plugins/data/common/field_formats/converters/source';
import { ColorFormat } from '../../../../../plugins/data/common/field_formats/converters/color';
import { TruncateFormat } from '../../../../../plugins/data/common/field_formats/converters/truncate';
import { BoolFormat } from '../../../../../plugins/data/common/field_formats/converters/boolean';
import { StaticLookupFormat } from '../../../../../plugins/data/common/field_formats/converters/static_lookup';

fieldFormats.register(UrlFormat);
fieldFormats.register(BytesFormat);
fieldFormats.register(DateFormat);
fieldFormats.register(DateNanosFormat);
fieldFormats.register(RelativeDateFormat);
fieldFormats.register(DurationFormat);
fieldFormats.register(IpFormat);
fieldFormats.register(NumberFormat);
fieldFormats.register(PercentFormat);
fieldFormats.register(StringFormat);
fieldFormats.register(SourceFormat);
fieldFormats.register(ColorFormat);
fieldFormats.register(TruncateFormat);
fieldFormats.register(BoolFormat);
fieldFormats.register(StaticLookupFormat);
