/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { UserContentPluginSetup, UserContentPluginStart } from './types';
import { UserContentService, MetadataEventsService } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export class UserContentPlugin implements Plugin<UserContentPluginSetup, UserContentPluginStart> {
  private userContentService: UserContentService = new UserContentService();
  constructor() {}

  public setup(
    core: CoreSetup<StartDependencies, UserContentPluginStart>,
    deps: SetupDependencies
  ): UserContentPluginSetup {
    return {};
  }

  public start(core: CoreStart, deps: StartDependencies) {
    const { http, savedObjects } = core;

    const metadataEventService = new MetadataEventsService();
    metadataEventService.init({ http });

    this.userContentService.init({ metadataEventService, savedObjectClient: savedObjects.client });

    const { register } = this.userContentService;

    return {
      userContentService: {
        register: register.bind(this.userContentService),
      },
    };
  }
}
