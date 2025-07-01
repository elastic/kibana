/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import type { RuntimeServices } from './stack_services';
import { createRuntimeServices } from './stack_services';

/**
 * Returns a logger that intercepts calls to the ToolingLog instance methods passed in input
 * and prefix it with the provided value. Useful in order to track log entries, especially when
 * logging output from multiple sources is concurrently being output to the same source
 * (ex. CI jobs and output to stdout).
 *
 * @param prefix
 * @param log
 *
 * @example
 * const logger = new ToolingLog();
 * const prefixedLogger = prefixedOutputLogger('my_log', logger);
 *
 * prefixedLogger.info('log something'); // => info [my_log] log something
 */
export const prefixedOutputLogger = (prefix: string, log: ToolingLog): ToolingLog => {
  const styledPrefix = `[${chalk.grey(prefix)}]`;
  const logIt = (type: keyof ToolingLog, ...args: any) => {
    return log[type](styledPrefix, ...args);
  };

  const logger: Partial<ToolingLog> = {
    info: logIt.bind(null, 'info'),
    debug: logIt.bind(null, 'debug'),
    verbose: logIt.bind(null, 'verbose'),
    success: logIt.bind(null, 'success'),
    warning: logIt.bind(null, 'warning'),
    write: logIt.bind(null, 'write'),
  };

  const proxy = new Proxy(log, {
    get(target: ToolingLog, prop: keyof ToolingLog, receiver: any): any {
      if (prop in logger) {
        return logger[prop];
      }

      return log[prop];
    },
  });

  return proxy;
};

const RUNTIME_SERVICES_CACHE = new WeakMap<Cypress.PluginConfigOptions, RuntimeServices>();

export const setupStackServicesUsingCypressConfig = async (config: Cypress.PluginConfigOptions) => {
  if (RUNTIME_SERVICES_CACHE.has(config)) {
    return RUNTIME_SERVICES_CACHE.get(config)!;
  }

  const isServerless = config.env.IS_SERVERLESS;
  const isCloudServerless = config.env.CLOUD_SERVERLESS;

  const stackServices = await createRuntimeServices({
    kibanaUrl: config.env.KIBANA_URL,
    elasticsearchUrl: config.env.ELASTICSEARCH_URL,
    fleetServerUrl: config.env.FLEET_SERVER_URL,
    username: config.env.KIBANA_USERNAME,
    password: config.env.KIBANA_PASSWORD,
    esUsername: config.env.ELASTICSEARCH_USERNAME,
    esPassword: config.env.ELASTICSEARCH_PASSWORD,
    asSuperuser: !isCloudServerless,
    useCertForSsl: !isCloudServerless && isServerless,
  }).then(({ log, ...others }) => {
    return {
      ...others,
      log: prefixedOutputLogger('cy.dfw', log),
    };
  });

  RUNTIME_SERVICES_CACHE.set(config, stackServices);

  return stackServices;
};
