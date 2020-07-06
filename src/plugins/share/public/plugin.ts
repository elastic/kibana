/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
