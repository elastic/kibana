/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';

export async function getEsQueryConfig(uiSettings: IUiSettingsClient) {
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
