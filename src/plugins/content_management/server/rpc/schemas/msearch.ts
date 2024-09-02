/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { versionSchema } from './common';
import { searchQuerySchema, searchResultSchema } from './search';

import type { ProcedureSchemas } from '../../../common';

export const mSearchSchemas: ProcedureSchemas = {
  in: schema.object(
    {
      contentTypes: schema.arrayOf(
        schema.object({ contentTypeId: schema.string(), version: versionSchema }),
        {
          minSize: 1,
        }
      ),
      query: searchQuerySchema,
    },
    { unknowns: 'forbid' }
  ),
  out: schema.object(
    {
      contentTypes: schema.arrayOf(
        schema.object({ contentTypeId: schema.string(), version: versionSchema })
      ),
      result: searchResultSchema,
    },
    { unknowns: 'forbid' }
  ),
};
