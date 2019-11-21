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

import { Capabilities, CapabilitiesProvider, CapabilitiesSwitcher } from './types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { KibanaRequest } from '../http';
import { mergeCapabilities } from './merge_capabilities';
import { capabilitiesResolver } from './resolve_capabilities';

export interface CapabilitiesSetup {
  registerCapabilitiesProvider(provider: CapabilitiesProvider): void;
  registerCapabilitiesSwitcher(switcher: CapabilitiesSwitcher): void;
}

export interface CapabilitiesStart {
  resolveCapabilities(request: KibanaRequest): Promise<Capabilities>;
}

const defaultCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

export class CapabilitiesService {
  private capabilitiesProviders: CapabilitiesProvider[] = [];
  private capabilitiesSwitchers: CapabilitiesSwitcher[] = [];
  private logger: Logger;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('capabilities-service');
  }

  public setup(): CapabilitiesSetup {
    this.logger.debug('Setting up capabilities service');
    return {
      registerCapabilitiesProvider: (provider: CapabilitiesProvider) => {
        this.capabilitiesProviders.push(provider);
      },
      registerCapabilitiesSwitcher: (switcher: CapabilitiesSwitcher) => {
        this.capabilitiesSwitchers.push(switcher);
      },
    };
  }

  public start(): CapabilitiesStart {
    return {
      resolveCapabilities: (request: KibanaRequest) => {
        const capabilities = mergeCapabilities(
          defaultCapabilities,
          ...this.capabilitiesProviders.map(provider => provider())
        );
        return capabilitiesResolver(capabilities, this.capabilitiesSwitchers)(request);
      },
    };
  }
}
