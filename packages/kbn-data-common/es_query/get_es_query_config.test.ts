/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { getEsQueryConfig } from './get_es_query_config';
import { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '..';

const config = {
  get(item: string) {
    return get(config, item);
  },
  [UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS]: {
    allowLeadingWildcards: true,
  },
  [UI_SETTINGS.QUERY_STRING_OPTIONS]: {
    queryStringOptions: {},
  },
  [UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX]: {
    ignoreFilterIfFieldNotInIndex: true,
  },
  'dateFormat:tz': {
    dateFormatTZ: 'Browser',
  },
} as unknown as IUiSettingsClient;

describe('getEsQueryConfig', () => {
  test('should return the parameters of an Elasticsearch query config requested', () => {
    const result = getEsQueryConfig(config);
    const expected = {
      allowLeadingWildcards: {
        allowLeadingWildcards: true,
      },
      dateFormatTZ: {
        dateFormatTZ: 'Browser',
      },
      ignoreFilterIfFieldNotInIndex: {
        ignoreFilterIfFieldNotInIndex: true,
      },
      queryStringOptions: {
        queryStringOptions: {},
      },
    };

    expect(result).toEqual(expected);

    expect(result).toHaveProperty('allowLeadingWildcards');
    expect(result).toHaveProperty('dateFormatTZ');
    expect(result).toHaveProperty('ignoreFilterIfFieldNotInIndex');
    expect(result).toHaveProperty('queryStringOptions');
  });
});
