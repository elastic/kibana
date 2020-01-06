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

import { fieldFormatsMixin } from './field_formats';
import { tutorialsMixin } from './tutorials_mixin';
import { uiAppsMixin } from './ui_apps';
import { uiBundlesMixin } from './ui_bundles';
import { uiRenderMixin } from './ui_render';
import { uiSettingsMixin } from './ui_settings';

export async function uiMixin(kbnServer) {
  await kbnServer.mixin(uiAppsMixin);
  await kbnServer.mixin(uiBundlesMixin);
  await kbnServer.mixin(uiSettingsMixin);
  await kbnServer.mixin(fieldFormatsMixin);
  await kbnServer.mixin(tutorialsMixin);
  await kbnServer.mixin(uiRenderMixin);
}
