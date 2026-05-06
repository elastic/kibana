/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ProvidedType } from '@kbn/test';

import type { EsArchiverProvider } from '../es_archiver';
import type { RetryService } from '../retry';
import type { KibanaServerProvider } from './kibana_server';

const ES_ARCHIVER_LOAD_METHODS = ['load', 'loadIfNeeded', 'unload', 'emptyKibanaIndex'] as const;

interface Options {
  esArchiver: ProvidedType<typeof EsArchiverProvider>;
  kibanaServer: ProvidedType<typeof KibanaServerProvider>;
  retry: RetryService;
  log: ToolingLog;
  defaults?: Record<string, any>;
  globalDefaults?: Record<string, any>;
}

export function extendEsArchiver({
  esArchiver,
  kibanaServer,
  retry,
  log,
  defaults,
  globalDefaults,
}: Options) {
  // only extend the esArchiver if there are default uiSettings to restore
  if (!defaults && !globalDefaults) {
    return;
  }

  ES_ARCHIVER_LOAD_METHODS.forEach((method) => {
    const originalMethod = esArchiver[method];

    esArchiver[method] = async (...args: unknown[]) => {
      // esArchiver methods return a stats object, with information about the indexes created
      const stats = await originalMethod.apply(esArchiver, args as any);

      const statsKeys = Object.keys(stats);
      const kibanaKeys = statsKeys.filter(
        // this also matches stats keys like '.kibana_1' and '.kibana_2,.kibana_1'
        (key) => key.includes(MAIN_SAVED_OBJECT_INDEX) && (stats[key].created || stats[key].deleted)
      );

      // if the kibana index was created or deleted by the esArchiver then update the uiSettings
      // with the defaults to make sure that they are always in place initially
      if (kibanaKeys.length > 0) {
        if (defaults) {
          await retry.try(async () => {
            await kibanaServer.uiSettings.update(defaults);
          });
        }
        if (globalDefaults) {
          await retry.try(async () => {
            try {
              await kibanaServer.uiSettings.updateGlobal(globalDefaults);
            } catch (err) {
              // If a setting is already enforced via server-level globalOverrides, the API returns 400.
              // That's fine — the override achieves the same goal.
              if (err?.message?.includes('because it is overridden')) {
                log.warning(
                  `Skipping globalDefaults update — setting already enforced by a server-level override: ${err.message}`
                );
                return;
              }
              throw err;
            }
          });
        }
      }

      return stats;
    };
  });
}
