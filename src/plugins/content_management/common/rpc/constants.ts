/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { validateVersion } from '@kbn/object-versioning/lib/utils';

export const procedureNames = [
  'get',
  'bulkGet',
  'create',
  'update',
  'delete',
  'search',
  'mSearch',
] as const;

export type ProcedureName = (typeof procedureNames)[number];

export const versionSchema = schema.number({
  validate: (value) => {
    const { result } = validateVersion(value);
    if (!result) {
      return 'must be an integer';
    }
  },
});
