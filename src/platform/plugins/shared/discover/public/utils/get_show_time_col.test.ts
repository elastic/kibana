/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import { getShowTimeCol } from './get_show_time_col';

const createUiSettingsMock = (hideTimeColumn: boolean) =>
  ({
    get: (key: string) => {
      if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
        return hideTimeColumn;
      }
      return undefined;
    },
  } as unknown as IUiSettingsClient);

describe('getShowTimeCol', () => {
  it('should return false when doc_table:hideTimeColumn setting is true', () => {
    expect(getShowTimeCol(createUiSettingsMock(true), undefined)).toBe(false);
  });

  it('should return true when no query is provided', () => {
    expect(getShowTimeCol(createUiSettingsMock(false), undefined)).toBe(true);
  });

  it('should return true for a Classic (non-aggregate) query', () => {
    expect(getShowTimeCol(createUiSettingsMock(false), { language: 'kuery', query: '*' })).toBe(
      true
    );
  });

  it('should return true for a non-transformational ES|QL query', () => {
    expect(
      getShowTimeCol(createUiSettingsMock(false), { esql: 'from logstash-* | where bytes > 0' })
    ).toBe(true);
  });

  it('should return false for a transformational ES|QL query with KEEP', () => {
    expect(
      getShowTimeCol(createUiSettingsMock(false), {
        esql: 'from logstash-* | keep ip, @timestamp',
      })
    ).toBe(false);
  });

  it('should return false for a transformational ES|QL query with STATS', () => {
    expect(
      getShowTimeCol(createUiSettingsMock(false), {
        esql: 'from logstash-* | stats count() by extension',
      })
    ).toBe(false);
  });

  it('should return false when setting is true even for non-transformational ES|QL', () => {
    expect(
      getShowTimeCol(createUiSettingsMock(true), { esql: 'from logstash-* | where bytes > 0' })
    ).toBe(false);
  });
});
