/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { FieldRow } from './field_row';

export const buildFieldRowMock = (args: Partial<ConstructorParameters<typeof FieldRow>[0]>) => {
  const defaultArgs = {
    name: 'field',
    flattenedValue: { foo: 'bar' },
    hit: buildDataTableRecord({}),
    dataView: buildDataViewMock({}),
    fieldFormats: fieldFormatsMock,
    isPinned: false,
    columnsMeta: undefined,
  };

  return new FieldRow({
    ...defaultArgs,
    ...args,
  });
};
