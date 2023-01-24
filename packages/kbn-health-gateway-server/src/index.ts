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
import { getConfigService } from './config';
import { config as kibanaConfig, KibanaService } from './kibana';
import { config as serverConfig, Server, ServerStart } from './server';

export async function bootstrap() {
  const loggingSystem = new LoggingSystem();
  const logger = loggingSystem.asLoggerFactory();
  const configService = getConfigService({ logger });

  const configDescriptors: ServiceConfigDescriptor[] = [loggingConfig, kibanaConfig, serverConfig];
  for (const { path, schema } of configDescriptors) {
    configService.setSchema(path, schema);
  }

  await configService.validate();

  await loggingSystem.upgrade(configService.atPathSync<LoggingConfigType>('logging'));
  const log = logger.get('root');

  let server: Server;
  let serverStart: ServerStart;
  try {
    server = new Server({ config: configService, logger });
    serverStart = await server.start();
  } catch (e) {
    log.error(`Failed to start Server: ${e}`);
    process.exit(1);
  }

  let kibanaService: KibanaService;
  try {
    kibanaService = new KibanaService({ config: configService, logger });
    await kibanaService.start({ server: serverStart });
  } catch (e) {
    log.error(`Failed to start Kibana service: ${e}`);
    process.exit(1);
  }

  const attemptGracefulShutdown = async (exitCode: number = 0) => {
    await server.stop();
    kibanaService.stop();
    await loggingSystem.stop();
    process.exit(exitCode);
  };

  process.on('unhandledRejection', async (err: Error) => {
    log.error(err);
    await attemptGracefulShutdown(1);
  });

  process.on('SIGINT', async () => await attemptGracefulShutdown());
  process.on('SIGTERM', async () => await attemptGracefulShutdown());
}
