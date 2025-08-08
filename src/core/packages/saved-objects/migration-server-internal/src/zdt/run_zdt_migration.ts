/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LogMessageSource } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsMigrationConfigType,
  MigrationResult,
  IDocumentMigrator,
} from '@kbn/core-saved-objects-base-server-internal';
import type { MigrationLog } from '../types';
import { buildMigratorConfigs } from './utils';
import { migrateIndex } from './migrate_index';

export interface RunZeroDowntimeMigrationOpts {
  /** The current Kibana version */
  kibanaVersion: string;
  /** The Kibana system index prefix. e.g `.kibana` or `.kibana_task_manager` */
  kibanaIndexPrefix: string;
  /** The SO type registry to use for the migration */
  typeRegistry: ISavedObjectTypeRegistry;
  /** Logger to use for migration output */
  logger: Logger;
  /** The document migrator to use to convert the document */
  documentMigrator: IDocumentMigrator;
  /** The migration config to use for the migration */
  migrationConfig: SavedObjectsMigrationConfigType;
  /** docLinks contract to use to link to documentation */
  docLinks: DocLinksServiceStart;
  /** SO serializer to use for migration */
  serializer: ISavedObjectsSerializer;
  /** The client to use for communications with ES */
  elasticsearchClient: ElasticsearchClient;
  /** The node roles of the Kibana instance */
  nodeRoles: NodeRoles;
  /** Capabilities of the ES cluster we're using */
  esCapabilities: ElasticsearchCapabilities;
}

export const runZeroDowntimeMigration = async (
  options: RunZeroDowntimeMigrationOpts
): Promise<MigrationResult[]> => {
  const migratorConfigs = buildMigratorConfigs({
    kibanaIndexPrefix: options.kibanaIndexPrefix,
    typeRegistry: options.typeRegistry,
  });

  return await Promise.all(
    migratorConfigs.map((migratorConfig) => {
      const logger = createCustomLogger(options.logger);
      const dumpLogs = () => {
        logger.dump();
      };
      process.on('uncaughtExceptionMonitor', dumpLogs);
      const promise = migrateIndex({
        ...options,
        ...migratorConfig,
        logger,
      });
      promise.finally(() => {
        process.removeListener('uncaughtExceptionMonitor', dumpLogs);
      });

      return promise;
    })
  );
};

function createCustomLogger(logger: Logger): Logger & { dump: () => void } {
  const migrationLogs: MigrationLog[] = [];

  return {
    ...logger,
    dump(): void {
      migrationLogs.forEach((log) => {
        const level = log.level === 'warning' ? 'warn' : log.level;
        logger[level](log.message);
      });
    },
    error(errorOrMessage: LogMessageSource | Error): void {
      migrationLogs.push({
        level: 'error',
        message: errorOrMessage.toString(),
      });
    },
    get(...childContextPaths: string[]): Logger {
      return createCustomLogger(logger.get(...childContextPaths));
    },
    info(message: LogMessageSource): void {
      migrationLogs.push({
        level: 'info',
        message: message.toString(),
      });
    },
    warn(errorOrMessage: LogMessageSource | Error): void {
      migrationLogs.push({
        level: 'warning',
        message: errorOrMessage.toString(),
      });
    },
  };
}
