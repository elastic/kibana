/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { API_BASE_PATH } from '../../common';
import { guidesConfig } from '../helpers/guides_config';

export const registerGetConfigRoute = (router: IRouter) => {
  // Fetch the config of the guide
  router.get(
    {
      path: `${API_BASE_PATH}/configs`,
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: { configs: guidesConfig },
      });
    }
  );
};
