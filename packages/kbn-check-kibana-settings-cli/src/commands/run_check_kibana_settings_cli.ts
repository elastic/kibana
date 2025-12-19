/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Listr, PRESET_TIMER } from 'listr2';
import { run } from '@kbn/dev-cli-runner';
import type { Root } from '@kbn/core-root-server-internal';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { getKibanaSettings } from './tasks';
import { setupKibana, startElasticsearch, stopElasticsearch, stopKibana } from '../util';

interface TaskContext {
  esServer?: TestElasticsearchUtils;
  kibanaServer?: Root;
  settings?: Array<{ setting: string; type: string }>;
}

export function runCheckKibanaSettingsCli() {
  let globalTask: Listr<TaskContext, 'default', 'simple'>;

  const context: TaskContext = {};

  run(
    async ({ log, flagsReader }) => {
      let exitCode = 0;

      globalTask = new Listr(
        [
          {
            title: 'Start ES',
            task: async (ctx) => (ctx.esServer = await startElasticsearch()),
          },
          {
            title: 'Setup Kibana',
            task: async (ctx) => {
              ctx.kibanaServer = await setupKibana();
            },
          },
          {
            title: 'Collect all configuration settings',
            task: async (ctx) => {
              ctx.settings = await getKibanaSettings(ctx.kibanaServer!);
              log.info('The following settings have been identified');
              log.info(JSON.stringify(ctx.settings, null, 2));
            },
          },
        ],
        {
          collectErrors: 'minimal',
          concurrent: false,
          exitOnError: true,
          fallbackRenderer: 'simple',
          rendererOptions: {
            collapseSubtasks: false,
            showErrorMessage: false,
            timer: PRESET_TIMER,
          },
        }
      );

      try {
        await globalTask.run(context);
        exitCode = globalTask.errors.length > 0 ? 1 : 0;
      } catch (err) {
        log.error(err);
        exitCode = 1;
      } finally {
        await new Listr<TaskContext, 'default', 'simple'>(
          [
            {
              title: 'Stop Kibana',
              task: async (ctx) => await stopKibana(ctx.kibanaServer!),
              enabled: (ctx) => Boolean(ctx.kibanaServer),
            },
            {
              title: 'Stop ES',
              task: async (ctx) => await stopElasticsearch(ctx.esServer!),
              enabled: (ctx) => Boolean(ctx.esServer),
            },
          ],
          { fallbackRenderer: 'simple', exitOnError: false }
        ).run(context);
      }
      process.exit(exitCode);
    },
    {
      description: `
      Determine what Kibana settings exist, and which ones are not explicitly defined in the allowed/denied settings in Cloud.

      Usage: node scripts/check_kibana_settings
    `,
    }
  );
}
