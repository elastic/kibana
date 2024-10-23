/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBoom } from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { getFields } from '../lib/get_fields';
import { Framework } from '../plugin';
import { ROUTES } from '../../common/constants';
import { VisTypeTimeseriesRouter } from '../types';

export const fieldsRoutes = (router: VisTypeTimeseriesRouter, framework: Framework) => {
  router.get<{}, { index: string }, {}>(
    {
      path: ROUTES.FIELDS,
      validate: {
        query: schema.object({ index: schema.string() }),
      },
    },
    async (context, req, res) => {
      try {
        return res.ok({ body: await getFields(context, req, framework, req.query.index) });
      } catch (err) {
        if (isBoom(err) && err.output.statusCode === 401) {
          return res.customError({
            body: err.output.payload,
            statusCode: err.output.statusCode,
            headers: err.output.headers as { [key: string]: string },
          });
        }

        return res.ok({
          body: [],
        });
      }
    }
  );
};
