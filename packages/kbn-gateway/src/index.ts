/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import {
  config as loggingConfig,
  LoggingSystem,
  LoggingConfigType,
} from '@kbn/core-logging-server-internal';
import { ConfigService } from './config';
import { config as kibanaConfig, KibanaService } from './kibana';
import { config as serverConfig, Server } from './server';

export function bootstrap() {
  const configService = new ConfigService();

  const configDescriptors: ServiceConfigDescriptor[] = [loggingConfig, kibanaConfig, serverConfig];
  for (const { path, schema } of configDescriptors) {
    configService.setSchema(path, schema);
  }

  configService
    .start()
    .then(async (configStart) => {
      const loggingSystem = new LoggingSystem();
      await loggingSystem.upgrade(configStart.atPathSync<LoggingConfigType>('logging'));
      const logger = loggingSystem.asLoggerFactory();
      const log = logger.get('root');

      const server = new Server({ config: configStart, logger });
      const serverStart = await server.start();

      const kibanaService = new KibanaService({ config: configStart, logger });
      await kibanaService.start({ server: serverStart });

      const attemptGracefulShutdown = async () => {
        await server.stop();
        kibanaService.stop();
        await loggingSystem.stop();
        configService.stop();
        process.exit(0);
      };

      process.on('unhandledRejection', (err: Error) => {
        log.error(err);
        process.exit(1);
      });

      process.on('SIGINT', async () => await attemptGracefulShutdown());
      process.on('SIGTERM', async () => await attemptGracefulShutdown());
    })
    .catch((e) => {
      configService.stop();
      // eslint-disable-next-line no-console
      console.error(e);
    });
}
