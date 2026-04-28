/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { HttpServiceSetup } from '@kbn/core/server';
import { coreServices } from '../kibana_services';
import { getUserActivityObject } from './user_actions';

export function registerTrackDashboardViewRoute({ http }: { http: HttpServiceSetup }) {
  const router = http.createRouter();
  router.post(
    {
      path: '/internal/dashboard/user_activity/view/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          duration: schema.number(),
        }),
      },
      security: {
        authz: {
          requiredPrivileges: ['read'],
        },
      },
    },
    async (ctx, req, res) => {
      console.log('here!!!', { ctx, req, res, test: req.route.options });
      const user = (await ctx.core).security.authc.getCurrentUser();
      coreServices.userActivity.trackUserAction({
        message: `User ${
          user ? `"${user.username}" (id: ${user.profile_uid})` : ''
        } viewed dashboard "${req.body.title}" (id: ${req.id}).`,
        event: {
          action: 'dashboard_view',
          type: 'access',
          start: '',
          end: '',
          duration: 0,
        },
        object: { id: req.id, name: req.body.title, type: 'dashboard', tags: [] },
        metadata: {
          userId: user?.profile_uid,
          username: user?.username,
          dashboardId: req.id,
          dashboardTitle: req.body.title,
          duration: 0,
        },
        // object: await getUserActivityObject(result, request),
      });
      return res.ok({ body: {} });
    }
  );
}
