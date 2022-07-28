/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { schema } from '@kbn/config-schema';

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export class UserProfilesPlugin
  implements Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>
{
  setup(core: CoreSetup<PluginStartDependencies>) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/internal/user_profiles_examples/_suggest',
        validate: {
          body: schema.object({
            name: schema.string(),
            dataPath: schema.maybe(schema.string()),
            requiredAppPrivileges: schema.maybe(schema.arrayOf(schema.string())),
          }),
        },
      },
      async (context, request, response) => {
        const [, pluginDeps] = await core.getStartServices();
        const profiles = await pluginDeps.security.userProfiles.suggest({
          name: request.body.name,
          dataPath: request.body.dataPath,
          requiredPrivileges: request.body.requiredAppPrivileges
            ? {
                spaceId: pluginDeps.spaces.spacesService.getSpaceId(request),
                privileges: {
                  kibana: request.body.requiredAppPrivileges.map((appPrivilege) =>
                    pluginDeps.security.authz.actions.app.get(appPrivilege)
                  ),
                },
              }
            : undefined,
        });
        return response.ok({ body: profiles });
      }
    );
  }

  start() {
    return {};
  }

  stop() {
    return {};
  }
}
