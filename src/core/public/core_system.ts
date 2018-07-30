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

import { FatalErrorsService } from './fatal_errors';
import { InjectedMetadataParams, InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformParams, LegacyPlatformService } from './legacy_platform';

interface Params {
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
  rootDomElement: LegacyPlatformParams['rootDomElement'];
  requireLegacyFiles: LegacyPlatformParams['requireLegacyFiles'];
  useLegacyTestHarness?: LegacyPlatformParams['useLegacyTestHarness'];
}

/**
 * The CoreSystem is the root of the new platform, and starts all parts
 * of Kibana in the UI, including the LegacyPlatform which is managed
 * by the LegacyPlatformService. As we migrate more things to the new
 * platform the CoreSystem will get many more Services.
 */
export class CoreSystem {
  private fatalErrors: FatalErrorsService;
  private injectedMetadata: InjectedMetadataService;
  private legacyPlatform: LegacyPlatformService;

  constructor(params: Params) {
    const { rootDomElement, injectedMetadata, requireLegacyFiles, useLegacyTestHarness } = params;

    this.injectedMetadata = new InjectedMetadataService({
      injectedMetadata,
    });

    this.fatalErrors = new FatalErrorsService({
      rootDomElement,
      injectedMetadata: this.injectedMetadata,
      stopCoreSystem: () => {
        this.stop();
      },
    });

    this.legacyPlatform = new LegacyPlatformService({
      rootDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  }

  public start() {
    try {
      const injectedMetadata = this.injectedMetadata.start();
      const fatalErrors = this.fatalErrors.start();
      this.legacyPlatform.start({ injectedMetadata, fatalErrors });
    } catch (error) {
      this.fatalErrors.add(error);
    }
  }

  public stop() {
    this.legacyPlatform.stop();
  }
}
