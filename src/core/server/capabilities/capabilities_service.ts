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

import { schema } from '@kbn/config-schema';
import { Capabilities, CapabilitiesProvider, CapabilitiesSwitcher } from './types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { InternalHttpServiceSetup, KibanaRequest } from '../http';
import { mergeCapabilities } from './merge_capabilities';
import { getCapabilitiesResolver, CapabilitiesResolver } from './resolve_capabilities';

export interface CapabilitiesSetup {
  registerCapabilitiesProvider(provider: CapabilitiesProvider): void;
  registerCapabilitiesSwitcher(switcher: CapabilitiesSwitcher): void;
}

export interface CapabilitiesStart {
  resolveCapabilities(request: KibanaRequest): Promise<Capabilities>;
}

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

const defaultCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

export class CapabilitiesService {
  private readonly logger: Logger;
  private readonly capabilitiesProviders: CapabilitiesProvider[] = [];
  private readonly capabilitiesSwitchers: CapabilitiesSwitcher[] = [];
  private readonly resolveCapabilities: CapabilitiesResolver;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('capabilities-service');
    this.resolveCapabilities = getCapabilitiesResolver(
      () =>
        mergeCapabilities(
          defaultCapabilities,
          ...this.capabilitiesProviders.map(provider => provider())
        ),
      () => this.capabilitiesSwitchers
    );
  }

  public setup(setupDeps: SetupDeps): CapabilitiesSetup {
    this.logger.debug('Setting up capabilities service');
    this.setupCapabilitiesRoute(setupDeps.http);

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
      resolveCapabilities: request => this.resolveCapabilities(request, []),
    };
  }

  private setupCapabilitiesRoute(http: InternalHttpServiceSetup) {
    const router = http.createRouter('/api/core/capabilities');
    router.post(
      {
        path: '',
        options: {
          authRequired: true,
        },
        validate: {
          body: schema.object({
            applications: schema.arrayOf(schema.string()),
          }),
        },
      },
      async (ctx, req, res) => {
        const { applications } = req.body;
        const capabilities = await this.resolveCapabilities(req, applications);
        return res.ok({
          body: capabilities,
        });
      }
    );
    router.post(
      {
        path: '/fallback',
        options: {
          authRequired: false,
        },
        validate: {
          body: schema.object({
            applications: schema.arrayOf(schema.string()),
          }),
        },
      },
      async (ctx, req, res) => {
        const { applications } = req.body;
        const capabilities = await this.resolveCapabilities(req, applications);
        return res.ok({
          body: capabilities,
        });
      }
    );
  }
}
