/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../common/constants';
import { RouteDependencies } from '../types';

const bodySchema = schema.object({
  index: schema.string(),
  script: schema.nullable(schema.string()),
  document: schema.object({}, { unknowns: 'allow' }),
});

export const registerFieldPreviewRoute = ({ router }: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/field_preview`,
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, req, res) => {
      return res.ok({ body: 'OK' });
    }
  );
};
