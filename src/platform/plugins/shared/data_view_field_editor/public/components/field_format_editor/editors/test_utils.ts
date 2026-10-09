/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

export const createFieldFormatMock = <TOverrides extends object = {}>(
  overrides: TOverrides = {} as TOverrides
): FieldFormat & TOverrides => {
  const format = fieldFormatsMock.deserialize() as unknown as FieldFormat & TOverrides;

  Object.assign(format, overrides);

  return format;
};
