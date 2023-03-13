/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';

import { validateVersion } from '../utils';

export const procedureNames = ['get', 'bulkGet', 'create', 'update', 'delete', 'search'] as const;

export type ProcedureName = typeof procedureNames[number];

export const versionSchema = schema.string({
  validate: (value) => {
    try {
      validateVersion(value);
    } catch (e) {
      return 'must follow the pattern [v${number}]';
    }
  },
});
