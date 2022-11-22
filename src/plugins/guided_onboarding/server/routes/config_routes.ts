/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { GuideId } from '@kbn/guided-onboarding';
import { API_BASE_PATH } from '../../common/constants';
import { getGuideConfig } from '../helpers';

export const registerGetConfigRoute = (router: IRouter) => {
  // Fetch the config of the guide
  router.get(
    {
      path: `${API_BASE_PATH}/config`,
      validate: {
        body: schema.object({
          guideId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { guideId } = request.body;

      const guideConfig = getGuideConfig(guideId as GuideId);
      if (!guideConfig) {
        const error = new Error('Unable to find the guide config.');
        return response.notFound({ body: error });
      }

      return response.ok({
        body: { config: guideConfig },
      });
    }
  );
};
