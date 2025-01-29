/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  CapabilitiesSwitcherOptions,
} from '@kbn/core-capabilities-server';
import type { SwitcherWithOptions } from './types';
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
  private readonly capabilitiesSwitchers: SwitcherWithOptions[] = [];
  private readonly resolveCapabilities: CapabilitiesResolver;
  private started = false;

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
        if (this.started) {
          throw new Error('registerProvider cannot be called after #start');
        }
        this.capabilitiesProviders.push(provider);
      },
      registerSwitcher: (switcher: CapabilitiesSwitcher, options: CapabilitiesSwitcherOptions) => {
        if (this.started) {
          throw new Error('registerSwitcher cannot be called after #start');
        }
        this.capabilitiesSwitchers.push({
          switcher,
          capabilityPath: Array.isArray(options.capabilityPath)
            ? options.capabilityPath
            : [options.capabilityPath],
        });
      },
    };
  }

  public start(): CapabilitiesStart {
    this.started = true;

    return {
      resolveCapabilities: (request, options) =>
        this.resolveCapabilities({
          request,
          capabilityPath: Array.isArray(options.capabilityPath)
            ? options.capabilityPath
            : [options.capabilityPath],
          useDefaultCapabilities: options.useDefaultCapabilities ?? false,
          applications: [],
        }),
    };
  }
}
