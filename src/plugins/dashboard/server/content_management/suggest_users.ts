/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, IRouter, CoreSetup } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { LISTING_LIMIT_SETTING } from '@kbn/saved-objects-settings';
import type { UserProfileAvatarData, UserProfileWithAvatar } from '@kbn/user-profile-components';

/**
 * Registers a route that suggests users based on the number of dashboards they have created.
 * This route is used by the dashboard listing page to suggest users to filter by.
 * Long term, this route should be embedded into content management
 */
export const registerSuggestUsersRoute = ({
  router,
  logger,
  core,
}: {
  router: IRouter;
  logger: Logger;
  core: CoreSetup<{ security?: SecurityPluginStart }>;
}) => {
  router.get(
    { path: '/internal/dashboard/suggest_users', validate: false },
    async (context, req, res) => {
      const [coreStart, { security }] = await core.getStartServices();
      if (!security) {
        return res.notFound({ body: 'Security is not available' });
      }

      try {
        const soClient = (await context.core).savedObjects.client;
        const listingLimit =
          (await coreStart.uiSettings
            .asScopedToClient(soClient)
            .get<number>(LISTING_LIMIT_SETTING)) ?? 100;
        const response = await soClient.find<never, { users: { buckets: Array<{ key: string }> } }>(
          {
            type: 'dashboard',
            perPage: 0,
            aggs: {
              users: {
                terms: {
                  field: 'created_by',
                  size: listingLimit,
                },
              },
            },
          }
        );

        const userProfileIds =
          response.aggregations?.users.buckets.map((bucket) => bucket.key) ?? [];

        const profiles =
          userProfileIds.length > 0
            ? await security.userProfiles.bulkGet<{ avatar?: UserProfileAvatarData }>({
                uids: new Set(userProfileIds),
                dataPath: 'avatar',
              })
            : [];

        // just making sure that we don't return more fields than when originally implemented
        // also would highlight if the user profile interfaces changes
        const sanitizedProfiles: UserProfileWithAvatar[] = profiles.map(
          (profile): UserProfileWithAvatar => ({
            uid: profile.uid,
            enabled: profile.enabled,
            user: {
              username: profile.user.username,
              email: profile.user.email,
              full_name: profile.user.full_name,
            },
            data: {
              avatar: profile.data.avatar,
            },
          })
        );

        return res.ok({
          body: sanitizedProfiles,
        });
      } catch (e) {
        logger.error(`Failed to suggest users: ${e.message}`, { error: e });
        return res.customError({ statusCode: 500, body: `Failed to suggest users` });
      }
    }
  );
};
