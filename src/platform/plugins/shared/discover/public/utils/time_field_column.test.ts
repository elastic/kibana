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
import { getColumnsWithTimeField, showTimeFieldColumn } from './time_field_column';

const createUiSettingsMock = ({ hideTimeColumn }: { hideTimeColumn: boolean }) =>
  ({
    get: (key: string) => {
      if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
        return hideTimeColumn;
      }
      return undefined;
    },
  } as unknown as IUiSettingsClient);

const uiSettingsMockWithHideTimeColumn = createUiSettingsMock({ hideTimeColumn: true });
const uiSettingsMock = createUiSettingsMock({ hideTimeColumn: false });

describe('showTimeFieldColumn', () => {
  it('should return false when doc_table:hideTimeColumn setting is true', () => {
    expect(
      showTimeFieldColumn({ uiSettings: uiSettingsMockWithHideTimeColumn, query: undefined })
    ).toBe(false);
  });

  it('should return true for a Classic (non-aggregate) query', () => {
    expect(
      showTimeFieldColumn({
        uiSettings: uiSettingsMock,
        query: {
          language: 'kuery',
          query: '*',
        },
      })
    ).toBe(true);
  });

  it('should return true for a non-transformational ES|QL query', () => {
    expect(
      showTimeFieldColumn({
        uiSettings: uiSettingsMock,
        query: {
          esql: 'from logstash-* | where bytes > 0',
        },
      })
    ).toBe(true);
  });

  it('should return false for a transformational ES|QL query with KEEP', () => {
    expect(
      showTimeFieldColumn({
        uiSettings: uiSettingsMock,
        query: {
          esql: 'from logstash-* | keep ip, @timestamp',
        },
      })
    ).toBe(false);
  });

  it('should return false when setting is true even for non-transformational ES|QL', () => {
    expect(
      showTimeFieldColumn({
        uiSettings: uiSettingsMockWithHideTimeColumn,
        query: {
          esql: 'from logstash-* | where bytes > 0',
        },
      })
    ).toBe(false);
  });
});

describe('getColumnsWithTimeField', () => {
  it('should prepend the time field for a non-transformational ES|QL query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['@timestamp', 'bytes', 'extension']);
  });

  it('should not prepend when columns are empty', () => {
    expect(
      getColumnsWithTimeField({
        columns: [],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual([]);
  });

  it('should not prepend for a transformational ES|QL query', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-* | keep bytes, extension' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should not prepend when timeFieldName is undefined', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: undefined,
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['bytes', 'extension']);
  });

  it('should not prepend when time field already in columns', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['@timestamp', 'bytes'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMock,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['@timestamp', 'bytes']);
  });

  it('should not prepend when hideTimeColumn setting is true', () => {
    expect(
      getColumnsWithTimeField({
        columns: ['bytes', 'extension'],
        timeFieldName: '@timestamp',
        uiSettings: uiSettingsMockWithHideTimeColumn,
        query: { esql: 'from logstash-*' },
      })
    ).toEqual(['bytes', 'extension']);
  });
});
