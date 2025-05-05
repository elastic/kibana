/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { FieldRow } from './field_row';

function classFabricator<TConstructor extends new (...args: any[]) => any>(
  ClassConstructor: TConstructor,
  ...baseArgs: ConstructorParameters<TConstructor>
) {
  return (
    overrides: Partial<ConstructorParameters<TConstructor>[0]> = {}
  ): InstanceType<TConstructor> => {
    const finalArgs = [{ ...baseArgs[0], ...overrides }];
    return new ClassConstructor(...finalArgs);
  };
}

export const fieldRowFabricator = classFabricator(FieldRow, {
  name: 'field',
  flattenedValue: { foo: 'bar' },
  hit: {
    id: '1',
    raw: {},
    flattened: { field: 'value' },
  },
  dataView: buildDataViewMock({
    name: 'dataView',
    fields: [] as unknown as DataView['fields'],
    timeFieldName: 'timeField',
  }),
  fieldFormats: fieldFormatsMock,
  isPinned: false,
  columnsMeta: undefined,
});
