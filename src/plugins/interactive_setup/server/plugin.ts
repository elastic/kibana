/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import type { Subscription } from 'rxjs';

import type { TypeOf } from '@kbn/config-schema';
import type {
  CorePreboot,
  Logger,
  PluginInitializerContext,
  PrebootPlugin,
} from '@kbn/core/server';
import { getDataPath } from '@kbn/utils';

import { ElasticsearchConnectionStatus } from '../common';
import type { ConfigSchema, ConfigType } from './config';
import { ElasticsearchService } from './elasticsearch_service';
import { KibanaConfigWriter } from './kibana_config_writer';
import { defineRoutes } from './routes';
import { VerificationService } from './verification_service';

// List of the Elasticsearch hosts Kibana uses by default.
const DEFAULT_ELASTICSEARCH_HOSTS = [
  'http://localhost:9200',
  // It's a default host we use in the official Kibana Docker image (see `kibana_yml.template.ts`).
  ...(process.env.ELASTIC_CONTAINER ? ['http://elasticsearch:9200'] : []),
];

export class InteractiveSetupPlugin implements PrebootPlugin {
  readonly #logger: Logger;
  readonly #elasticsearch: ElasticsearchService;
  readonly #verification: VerificationService;

  #elasticsearchConnectionStatusSubscription?: Subscription;

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
    this.#elasticsearch = new ElasticsearchService(
      this.initializerContext.logger.get('elasticsearch'),
      initializerContext.env.packageInfo.version
    );
    this.#verification = new VerificationService(
      this.initializerContext.logger.get('verification')
    );
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
      DEFAULT_ELASTICSEARCH_HOSTS.includes(core.elasticsearch.config.hosts[0]);
    if (!shouldActiveSetupMode) {
      const reason = core.elasticsearch.config.credentialsSpecified
        ? 'Kibana system user credentials are specified'
        : core.elasticsearch.config.hosts.length > 1
        ? 'more than one Elasticsearch host is specified'
        : 'non-default Elasticsearch host is used';
      this.#logger.debug(
        `Interactive setup mode will not be activated since Elasticsearch connection is already configured: ${reason}.`
      );
      return;
    }

    const verificationCode = this.#verification.setup();
    if (!verificationCode) {
      this.#logger.error(
        'Interactive setup mode could not be activated. Ensure Kibana has permission to write to its config folder.'
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
          const pathname = core.http.basePath.prepend('/');
          const { protocol, hostname, port } = core.http.getServerInfo();
          const url = `${protocol}://${hostname}:${port}${pathname}?code=${verificationCode.code}`;

          // eslint-disable-next-line no-console
          console.log(`

${chalk.whiteBright.bold(`${chalk.cyanBright('i')} Kibana has not been configured.`)}

Go to ${chalk.cyanBright.underline(url)} to get started.

`);
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
        kibanaConfigWriter: new KibanaConfigWriter(
          configPath,
          getDataPath(),
          this.#logger.get('kibana-config')
        ),
        elasticsearch,
        verificationCode,
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
    this.#verification.stop();
  }
}
