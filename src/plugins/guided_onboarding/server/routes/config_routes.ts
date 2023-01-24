/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { GuideId } from '@kbn/guided-onboarding';
import { API_BASE_PATH } from '../../common';
import type { GuidesConfig } from '../../common';

export const registerGetConfigRoute = (router: IRouter, guidesConfig: GuidesConfig) => {
  // Fetch the config of the guide
  router.get(
    {
      path: `${API_BASE_PATH}/configs/{guideId}`,
      validate: {
        params: schema.object({
          guideId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { guideId } = request.params;
      if (guidesConfig && guideId && Object.keys(guidesConfig).includes(guideId)) {
        return response.ok({
          body: { config: guidesConfig[guideId as GuideId] },
        });
      }
      return response.notFound();
    }
  );
};
