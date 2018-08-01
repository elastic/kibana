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

import * as i18n from '../core/i18n';

export function i18nProvider() {
  this.addMessages = i18n.addMessages;
  this.getMessages = i18n.getMessages;
  this.setLocale = i18n.setLocale;
  this.getLocale = i18n.getLocale;
  this.setDefaultLocale = i18n.setDefaultLocale;
  this.getDefaultLocale = i18n.getDefaultLocale;
  this.setFormats = i18n.setFormats;
  this.getFormats = i18n.getFormats;
  this.getRegisteredLocales = i18n.getRegisteredLocales;
  this.init = i18n.init;
  this.$get = () => i18n.translate;
}
