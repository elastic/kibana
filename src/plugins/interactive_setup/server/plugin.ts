/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CorePreboot, PrebootPlugin, PluginInitializerContext } from 'src/core/server';
import chalk from 'chalk';
import type { ConfigType } from './config';
import { defineRoutes } from './routes';

export class InteractiveSetupPlugin implements PrebootPlugin {
  readonly #initializerContext: PluginInitializerContext<ConfigType>;
  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.#initializerContext = initializerContext;
  }

  public setup(core: CorePreboot) {
    const config = this.#initializerContext.config.get<ConfigType>();
    const logger = this.#initializerContext.logger.get('plugins', 'interactiveSetup');

    const isManuallyConfigured =
      core.elasticsearch.config.credentialsSpecified ||
      core.elasticsearch.config.hosts.length !== 1 ||
      core.elasticsearch.config.hosts[0] !== 'http://localhost:9200';
    const skipInteractiveSetup =
      config.holdSetup === 'never'
        ? true
        : config.holdSetup === 'always'
        ? false
        : isManuallyConfigured;

    if (skipInteractiveSetup) {
      if (isManuallyConfigured) {
        logger.debug(
          'Skipping interactive setup since Elasticsearch connection has been configured'
        );
      }
      return;
    }

    core.http.registerRoutes('', (router) => {
      const reason = `

${chalk.bold(chalk.whiteBright(`${chalk.cyanBright('i')} Kibana has not been configured.`))}

Go to ${chalk.underline(chalk.cyanBright('http://localhost:5601'))} to get started.
`;

      core.preboot.holdSetupUntilResolved(
        reason,
        new Promise((completeSetup) => {
          defineRoutes({
            router,
            completeSetup,
            initializerContext: this.#initializerContext,
            core,
            logger,
          });
        })
      );
    });
  }

  public stop() {}
}
