/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { schema } from '@kbn/config-schema';

export interface SetupDeps {
  features: FeaturesPluginSetup;
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface StartDeps {
  features: FeaturesPluginStart;
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export class UserProfilesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/internal/user_profiles_examples/_suggest',
        validate: {
          body: schema.object({
            name: schema.string(),
            dataPath: schema.maybe(schema.string()),
          }),
        },
        /**
         * Important: You must restrict access to this endpoint using access `tags`.
         */
        security: {
          authz: {
            requiredPrivileges: ['suggestUserProfiles'],
          },
        },
      },
      async (context, request, response) => {
        const [, pluginDeps] = await core.getStartServices();

        /**
         * Important: `requiredPrivileges` must be hard-coded server-side and cannot be exposed as a
         * param client-side.
         *
         * If your app requires suggestions based on different privileges you must expose separate
         * endpoints for each use-case.
         *
         * In this example we ensure that suggested users have access to the current space and are
         * able to login but in your app you will want to change that to something more relevant.
         */
        const profiles = await pluginDeps.security.userProfiles.suggest({
          name: request.body.name,
          dataPath: request.body.dataPath,
          requiredPrivileges: {
            spaceId: pluginDeps.spaces.spacesService.getSpaceId(request),
            privileges: {
              kibana: [pluginDeps.security.authz.actions.login],
            },
          },
        });

        return response.ok({ body: profiles });
      }
    );
  }

  start() {
    return {};
  }
}
