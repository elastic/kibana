/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Subscription } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import type { CorePreboot, Logger, PluginInitializerContext, PrebootPlugin } from 'src/core/server';

import { ElasticsearchConnectionStatus } from '../common';
import type { ConfigSchema, ConfigType } from './config';
import { defineRoutes } from './routes';

export class UserSetupPlugin implements PrebootPlugin {
  readonly #logger: Logger;

  #configSubscription?: Subscription;
  #config?: ConfigType;
  readonly #getConfig = () => {
    if (!this.#config) {
      throw new Error('Config is not available.');
    }
    return this.#config;
  };

  #elasticsearchConnectionStatus = ElasticsearchConnectionStatus.Unknown;
  readonly #getElasticsearchConnectionStatus = () => {
    return this.#elasticsearchConnectionStatus;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.#logger = this.initializerContext.logger.get();
  }

  public setup(core: CorePreboot) {
    this.#configSubscription = this.initializerContext.config
      .create<TypeOf<typeof ConfigSchema>>()
      .subscribe((config) => {
        this.#config = config;
      });

    // We shouldn't activate interactive setup mode if we detect that user has already configured
    // Elasticsearch connection manually: either if Kibana system user credentials are specified or
    // user specified non-default host for the Elasticsearch.
    const shouldActiveSetupMode =
      !core.elasticsearch.config.credentialsSpecified &&
      core.elasticsearch.config.hosts.length === 1 &&
      core.elasticsearch.config.hosts[0] === 'http://localhost:9200';
    if (!shouldActiveSetupMode) {
      this.#logger.debug(
        'Interactive setup mode will not be activated since Elasticsearch connection is already configured.'
      );
      return;
    }

    let completeSetup: (result: { shouldReloadConfig: boolean }) => void;
    core.preboot.holdSetupUntilResolved(
      'Validating Elasticsearch connection configuration…',
      new Promise((resolve) => {
        completeSetup = resolve;
      })
    );

    // If preliminary check above indicates that user didn't alter default Elasticsearch connection
    // details, it doesn't mean Elasticsearch connection isn't configured. There is a chance that they
    // already disabled security features in Elasticsearch and everything should work by default.
    // We should check if we can connect to Elasticsearch with default configuration to know if we
    // need to activate interactive setup. This check can take some time, so we should register our
    // routes to let interactive setup UI to handle user requests until the check is complete.
    core.elasticsearch
      .createClient('ping')
      .asInternalUser.ping()
      .then(
        (pingResponse) => {
          if (pingResponse.body) {
            this.#logger.debug(
              'Kibana is already properly configured to connect to Elasticsearch. Interactive setup mode will not be activated.'
            );
            this.#elasticsearchConnectionStatus = ElasticsearchConnectionStatus.Configured;
            completeSetup({ shouldReloadConfig: false });
          } else {
            this.#logger.debug(
              'Kibana is not properly configured to connect to Elasticsearch. Interactive setup mode will be activated.'
            );
            this.#elasticsearchConnectionStatus = ElasticsearchConnectionStatus.NotConfigured;
          }
        },
        () => {
          // TODO: we should probably react differently to different errors. 401 - credentials aren't correct, etc.
          // Do we want to constantly ping ES if interactive mode UI isn't active? Just in case user runs Kibana and then
          // configure Elasticsearch so that it can eventually connect to it without any configuration changes?
          this.#elasticsearchConnectionStatus = ElasticsearchConnectionStatus.NotConfigured;
        }
      );

    core.http.registerRoutes('', (router) => {
      defineRoutes({
        router,
        basePath: core.http.basePath,
        logger: this.#logger.get('routes'),
        getConfig: this.#getConfig.bind(this),
        getElasticsearchConnectionStatus: this.#getElasticsearchConnectionStatus.bind(this),
      });
    });
  }

  public stop() {
    this.#logger.debug('Stopping plugin');

    if (this.#configSubscription) {
      this.#configSubscription.unsubscribe();
      this.#configSubscription = undefined;
    }
  }
}
