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

import { tryRegisterSettingsComponent } from './component_registry';
import { PageTitle } from './page_title';
import { PageSubtitle } from './page_subtitle';
import { PageFooter } from './page_footer';

export const PAGE_TITLE_COMPONENT = 'advanced_settings_page_title';
export const PAGE_SUBTITLE_COMPONENT = 'advanced_settings_page_subtitle';
export const PAGE_FOOTER_COMPONENT = 'advanced_settings_page_footer';

export function registerDefaultComponents() {
  tryRegisterSettingsComponent(PAGE_TITLE_COMPONENT, PageTitle);
  tryRegisterSettingsComponent(PAGE_SUBTITLE_COMPONENT, PageSubtitle);
  tryRegisterSettingsComponent(PAGE_FOOTER_COMPONENT, PageFooter);
}
