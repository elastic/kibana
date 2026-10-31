/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPath, getTabs } from './utils';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';

const createDataViewWithScriptedField = () => {
  const fields = [
    { name: 'bytes', scripted: false },
    { name: 'bytes_in_kb', scripted: true },
  ] as unknown as DataViewField[];

  return {
    type: undefined,
    fields: { getAll: () => fields },
    getSourceFiltering: () => ({ excludes: [] }),
    getScriptedFields: () => fields.filter(({ scripted }) => scripted),
  } as unknown as DataView;
};

const getTabTestSubjects = (scriptedFieldsEnabled: boolean) =>
  getTabs(createDataViewWithScriptedField(), '', 0, scriptedFieldsEnabled).map(
    (tab) => tab['data-test-subj']
  );

test('getPath() should encode "fieldName"', () => {
  expect(
    getPath(
      { name: 'Memory: Allocated Bytes/sec' } as unknown as DataViewField,
      { id: 'id' } as unknown as DataView
    )
  ).toMatchInlineSnapshot(`"/dataView/id/field/Memory%3A%20Allocated%20Bytes%2Fsec"`);
});

describe('getTabs()', () => {
  test('shows the scripted fields tab when scripted fields are enabled', () => {
    expect(getTabTestSubjects(true)).toContain('tab-scriptedFields');
  });

  test('hides the scripted fields tab when scripted fields are disabled', () => {
    expect(getTabTestSubjects(false)).not.toContain('tab-scriptedFields');
  });
});
