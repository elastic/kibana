/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type {
  Capabilities,
  CoreSetup,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'kibana/server';
import { BehaviorSubject, Observable } from 'rxjs';
import { createClusterDataCheck } from './check_cluster_data';
import { ConfigType } from './config';
import { setupAppStateRoute, setupAnonymousAccessCapabilitiesRoute } from './routes';

export interface SecurityOssPluginSetup {
  /**
   * Allows consumers to show/hide the insecure cluster warning.
   */
  showInsecureClusterWarning$: BehaviorSubject<boolean>;

  /**
   * Set the provider function that returns a service to deal with the anonymous access.
   * @param provider
   */
  setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessService) => void;
}

export interface AnonymousAccessService {
  /**
   * Indicates whether anonymous access is enabled.
   */
  readonly isAnonymousAccessEnabled: boolean;

  /**
   * A map of query string parameters that should be specified in the URL pointing to Kibana so
   * that anonymous user can automatically log in.
   */
  readonly accessURLParameters: Readonly<Map<string, string>> | null;

  /**
   * Gets capabilities of the anonymous service account.
   * @param request Kibana request instance.
   */
  getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}

export class SecurityOssPlugin implements Plugin<SecurityOssPluginSetup, void, {}, {}> {
  private readonly config$: Observable<ConfigType>;
  private readonly logger: Logger;
  private anonymousAccessServiceProvider?: () => AnonymousAccessService;

  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.config$ = initializerContext.config.create();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const showInsecureClusterWarning$ = new BehaviorSubject<boolean>(true);

    setupAppStateRoute({
      router,
      log: this.logger,
      config$: this.config$,
      displayModifier$: showInsecureClusterWarning$,
      doesClusterHaveUserData: createClusterDataCheck(),
      getAnonymousAccessService: () => this.anonymousAccessServiceProvider?.() ?? null,
    });

    setupAnonymousAccessCapabilitiesRoute({
      router,
      getAnonymousAccessService: () => this.anonymousAccessServiceProvider?.() ?? null,
    });

    return {
      showInsecureClusterWarning$,
      setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessService) => {
        if (this.anonymousAccessServiceProvider) {
          throw new Error('Anonymous Access service provider is already set.');
        }

        this.anonymousAccessServiceProvider = provider;
      },
    };
  }

  public start() {}

  public stop() {}
}
