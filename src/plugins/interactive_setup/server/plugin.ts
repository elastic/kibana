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
import { ElasticsearchService } from './elasticsearch_service';
import { KibanaConfigWriter } from './kibana_config_writer';
import { defineRoutes } from './routes';

export class UserSetupPlugin implements PrebootPlugin {
  readonly #logger: Logger;

  #elasticsearchConnectionStatusSubscription?: Subscription;
  readonly #elasticsearch = new ElasticsearchService(
    this.initializerContext.logger.get('elasticsearch')
  );

  #configSubscription?: Subscription;
  #config?: ConfigType;
  readonly #getConfig = () => {
    if (!this.#config) {
      throw new Error('Config is not available.');
    }
    return this.#config;
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

    // If preliminary checks above indicate that user didn't alter default Elasticsearch connection
    // details, it doesn't mean Elasticsearch connection isn't configured. There is a chance that
    // user has already disabled security features in Elasticsearch and everything should work by
    // default. We should check if we can connect to Elasticsearch with default configuration to
    // know if we need to activate interactive setup. This check can take some time, so we should
    // register our routes to let interactive setup UI to handle user requests until the check is
    // complete. Moreover Elasticsearch may be just temporarily unavailable and we should poll its
    // status until we can connect or use configures connection via interactive setup mode.
    const elasticsearch = this.#elasticsearch.setup({
      elasticsearch: core.elasticsearch,
      connectionCheckInterval: this.#getConfig().connectionCheck.interval,
    });
    this.#elasticsearchConnectionStatusSubscription = elasticsearch.connectionStatus$.subscribe(
      (status) => {
        if (status === ElasticsearchConnectionStatus.Configured) {
          this.#logger.debug(
            'Skipping interactive setup mode since Kibana is already properly configured to connect to Elasticsearch at http://localhost:9200.'
          );
          completeSetup({ shouldReloadConfig: false });
        } else {
          this.#logger.debug(
            'Starting interactive setup mode since Kibana cannot to connect to Elasticsearch at http://localhost:9200.'
          );
        }
      }
    );

    // If possible, try to use `*.dev.yml` config when Kibana is run in development mode.
    const configPath = this.initializerContext.env.mode.dev
      ? this.initializerContext.env.configs.find((config) => config.endsWith('.dev.yml')) ??
        this.initializerContext.env.configs[0]
      : this.initializerContext.env.configs[0];

    core.http.registerRoutes('', (router) => {
      defineRoutes({
        router,
        basePath: core.http.basePath,
        logger: this.#logger.get('routes'),
        preboot: { ...core.preboot, completeSetup },
        kibanaConfigWriter: new KibanaConfigWriter(configPath, this.#logger.get('kibana-config')),
        elasticsearch,
        getConfig: this.#getConfig.bind(this),
      });
    });
  }

  public stop() {
    this.#logger.debug('Stopping plugin');

    if (this.#configSubscription) {
      this.#configSubscription.unsubscribe();
      this.#configSubscription = undefined;
    }

    if (this.#elasticsearchConnectionStatusSubscription) {
      this.#elasticsearchConnectionStatusSubscription.unsubscribe();
      this.#elasticsearchConnectionStatusSubscription = undefined;
    }

    this.#elasticsearch.stop();
  }
}
