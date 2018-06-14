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

import { RegistryFieldFormatEditorsProvider } from '../registry/field_format_editors';
import { bytesEditor } from './editors/numeral/bytes';
import { colorEditor } from './editors/color/color';
import { dateEditor } from './editors/date/date';
import { durationEditor } from './editors/duration/duration';
import { numberEditor } from './editors/numeral/number';
import { percentEditor } from './editors/numeral/percent';
import { stringEditor } from './editors/string/string';
import { truncateEditor } from './editors/truncate/truncate';
import { urlEditor } from './editors/url/url';

RegistryFieldFormatEditorsProvider.register(bytesEditor);
RegistryFieldFormatEditorsProvider.register(colorEditor);
RegistryFieldFormatEditorsProvider.register(dateEditor);
RegistryFieldFormatEditorsProvider.register(durationEditor);
RegistryFieldFormatEditorsProvider.register(numberEditor);
RegistryFieldFormatEditorsProvider.register(percentEditor);
RegistryFieldFormatEditorsProvider.register(stringEditor);
RegistryFieldFormatEditorsProvider.register(truncateEditor);
RegistryFieldFormatEditorsProvider.register(urlEditor);
