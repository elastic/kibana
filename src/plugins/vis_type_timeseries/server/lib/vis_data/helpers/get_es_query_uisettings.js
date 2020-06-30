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

import { UI_SETTINGS } from '../../../../../data/server';

export async function getEsQueryConfig(req) {
  const uiSettings = req.getUiSettingsService();
  const allowLeadingWildcards = await uiSettings.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS);
  const queryStringOptions = await uiSettings.get(UI_SETTINGS.QUERY_STRING_OPTIONS);
  const ignoreFilterIfFieldNotInIndex = await uiSettings.get(
    UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX
  );
  return {
    allowLeadingWildcards,
    queryStringOptions: JSON.parse(queryStringOptions),
    ignoreFilterIfFieldNotInIndex,
  };
}
