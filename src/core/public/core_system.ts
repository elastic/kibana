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

// import global polyfills before everything else
import 'babel-polyfill';
import 'custom-event-polyfill';
import 'whatwg-fetch';

import { InjectedMetadata, InjectedMetadataService } from './injected_metadata';

interface CoreSystemParams {
  injectedMetadataForTesting?: InjectedMetadata;
}

export class CoreSystem {
  private injectedMetadata: InjectedMetadataService;

  constructor(params: CoreSystemParams = {}) {
    const { injectedMetadataForTesting } = params;

    this.injectedMetadata = new InjectedMetadataService(injectedMetadataForTesting);
  }

  public initLegacyPlatform(bootstrapFn: () => void) {
    /**
     * Injects parts of the new platform into parts of the legacy platform
     * so that legacy APIs/modules can mimic their new platform counterparts
     */
    require('ui/metadata').__newPlatformInit__(this.injectedMetadata.getLegacyMetadata());

    // call the legacy platform bootstrap function (bootstraps ui/chrome in apps and ui/test_harness in browser tests)
    bootstrapFn();
  }
}
