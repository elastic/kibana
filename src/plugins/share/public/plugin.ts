/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './index.scss';

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ShareMenuManager, ShareMenuManagerStart } from './services';
import { ShareMenuRegistry, ShareMenuRegistrySetup } from './services';
import { createShortUrlRedirectApp } from './services/short_url_redirect_app';
import {
  UrlGeneratorsService,
  UrlGeneratorsSetup,
  UrlGeneratorsStart,
} from './url_generators/url_generator_service';

export class SharePlugin implements Plugin<SharePluginSetup, SharePluginStart> {
  private readonly shareMenuRegistry = new ShareMenuRegistry();
  private readonly shareContextMenu = new ShareMenuManager();
  private readonly urlGeneratorsService = new UrlGeneratorsService();

  public setup(core: CoreSetup): SharePluginSetup {
    core.application.register(createShortUrlRedirectApp(core, window.location));
    return {
      ...this.shareMenuRegistry.setup(),
      urlGenerators: this.urlGeneratorsService.setup(core),
    };
  }

  public start(core: CoreStart): SharePluginStart {
    return {
      ...this.shareContextMenu.start(core, this.shareMenuRegistry.start()),
      urlGenerators: this.urlGeneratorsService.start(core),
    };
  }
}

/** @public */
export type SharePluginSetup = ShareMenuRegistrySetup & {
  urlGenerators: UrlGeneratorsSetup;
};

/** @public */
export type SharePluginStart = ShareMenuManagerStart & {
  urlGenerators: UrlGeneratorsStart;
};
