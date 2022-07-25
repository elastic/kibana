/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type {
  CapabilitiesProvider,
  CapabilitiesSwitcher,
  CapabilitiesStart,
  CapabilitiesSetup,
} from '@kbn/core-capabilities-server';
import { mergeCapabilities } from './merge_capabilities';
import { getCapabilitiesResolver, CapabilitiesResolver } from './resolve_capabilities';
import { registerRoutes } from './routes';

interface PrebootSetupDeps {
  http: InternalHttpServicePreboot;
}

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

const defaultCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

/** @internal */
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
          ...this.capabilitiesProviders.map((provider) => provider())
        ),
      () => this.capabilitiesSwitchers
    );
  }

  public preboot(prebootDeps: PrebootSetupDeps) {
    this.logger.debug('Prebooting capabilities service');

    // The preboot server has no need for real capabilities.
    // Returning the un-augmented defaults is sufficient.
    prebootDeps.http.registerRoutes('', (router) => {
      registerRoutes(router, async () => defaultCapabilities);
    });
  }

  public setup(setupDeps: SetupDeps): CapabilitiesSetup {
    this.logger.debug('Setting up capabilities service');

    registerRoutes(setupDeps.http.createRouter(''), this.resolveCapabilities);

    return {
      registerProvider: (provider: CapabilitiesProvider) => {
        this.capabilitiesProviders.push(provider);
      },
      registerSwitcher: (switcher: CapabilitiesSwitcher) => {
        this.capabilitiesSwitchers.push(switcher);
      },
    };
  }

  public start(): CapabilitiesStart {
    return {
      resolveCapabilities: (request, options) =>
        this.resolveCapabilities(request, [], options?.useDefaultCapabilities ?? false),
    };
  }
}
