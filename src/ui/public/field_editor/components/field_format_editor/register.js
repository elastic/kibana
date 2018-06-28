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

import { RegistryFieldFormatEditorsProvider } from 'ui/registry/field_format_editors';
import { BytesEditor } from './editors/bytes';
import { ColorEditor } from './editors/color';
import { DateEditor } from './editors/date';
import { DurationEditor } from './editors/duration';
import { NumberEditor } from './editors/number';
import { PercentEditor } from './editors/percent';
import { StaticLookupEditor } from './editors/static_lookup';
import { StringEditor } from './editors/string';
import { TruncateEditor } from './editors/truncate';
import { UrlEditor } from './editors/url';

RegistryFieldFormatEditorsProvider.register(BytesEditor);
RegistryFieldFormatEditorsProvider.register(ColorEditor);
RegistryFieldFormatEditorsProvider.register(DateEditor);
RegistryFieldFormatEditorsProvider.register(DurationEditor);
RegistryFieldFormatEditorsProvider.register(NumberEditor);
RegistryFieldFormatEditorsProvider.register(PercentEditor);
RegistryFieldFormatEditorsProvider.register(StaticLookupEditor);
RegistryFieldFormatEditorsProvider.register(StringEditor);
RegistryFieldFormatEditorsProvider.register(TruncateEditor);
RegistryFieldFormatEditorsProvider.register(UrlEditor);
