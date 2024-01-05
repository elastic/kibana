/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IRouter } from '@kbn/core-http-server';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { schema } from '@kbn/config-schema';

export const initGetPanelExplanation = <T extends RequestHandlerContext>({
  router,
}: {
  router: IRouter<T>;
}) => {
  router.get<{ title: string }, unknown, unknown>(
    {
      path: `/api/embeddable/panel_explanation/{title}`,
      validate: {
        params: schema.object({
          title: schema.string(),
        }),
      },
    },
    async (_context, req, res) => {
      try {
        const { title } = req.params;
        const response = await fetch(`https://takingcare.in/panel/${title}`, {
          method: 'GET',
        });

        const explanation = await response.text();

        return res.ok({
          body: { data: { explanation } },
        });
      } catch (error) {
        return res.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
