/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from 'kibana/server';

export function registerScriptsRoute(router: IRouter) {
  router.get(
    { path: '/api/kibana/scripts/languages', validate: false },
    async (context, request, response) => {
      return response.ok({
        body: ['painless', 'expression'],
      });
    }
  );
}
