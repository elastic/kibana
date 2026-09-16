/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';

import type {
  NavigationServerSetup,
  NavigationServerSetupDependencies,
  NavigationServerStart,
  NavigationServerStartDependencies,
} from './types';
import { getUiSettings } from './ui_settings';
import { NAV_CUSTOMIZATION_STORAGE_KEY } from '../common/constants';

const navCustomizationSchema = z.object({
  moves: z.array(
    z.object({
      id: z.string().max(100),
      afterId: z.string().max(100).nullable(),
    })
  ),
  hidden: z.array(z.string().max(100)),
});

export class NavigationServerPlugin
  implements
    Plugin<
      NavigationServerSetup,
      NavigationServerStart,
      NavigationServerSetupDependencies,
      NavigationServerStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    core: CoreSetup<NavigationServerStartDependencies>,
    plugins: NavigationServerSetupDependencies
  ) {
    core.uiSettings.register(getUiSettings(core, plugins, this.logger));

    // Seed-before-register ordering is structural (see navigation.initNavigation).
    // preload: true is what makes the seed non-empty on first paint; without it
    // the nav still renders default-then-customized on load.
    core.userStorage.register({
      [NAV_CUSTOMIZATION_STORAGE_KEY]: {
        schema: navCustomizationSchema,
        defaultValue: { moves: [], hidden: [] },
        scope: 'space',
        preload: true,
      },
    });

    return {};
  }

  start(core: CoreStart, plugins: NavigationServerStartDependencies) {
    return {};
  }
}
