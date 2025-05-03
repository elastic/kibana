/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TASK_ID, DELETE_UNUSED_URLS_TASK } from '@kbn/unused-urls-cleanup/server/constants';
import { runDeleteUnusedUrlsTask } from '@kbn/unused-urls-cleanup/server/lib';
import type { UnusedUrlsCleanupPluginSetup, UnusedUrlsCleanupPluginStart } from './types';
import type { UnusedUrlsCleanupPluginConfig } from './config';

export class UnusedUrlsCleanupPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly config: UnusedUrlsCleanupPluginConfig;
  private taskManagerSetup: TaskManagerSetupContract | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<UnusedUrlsCleanupPluginConfig>();
  }

  public setup(_core: CoreSetup, { taskManager }: UnusedUrlsCleanupPluginSetup) {
    this.taskManagerSetup = taskManager;
  }

  public start(core: CoreStart, { taskManager }: UnusedUrlsCleanupPluginStart) {
    const {
      logger,
      taskManagerSetup,
      config: { maxAge },
    } = this;

    if (!taskManagerSetup) {
      logger.error('taskManagerSetup is not defined');
      return;
    }

    const savedObjectsRepository = core.savedObjects.createInternalRepository();
    const filter = `url.attributes.accessDate <= now-${maxAge}`;

    taskManagerSetup.registerTaskDefinitions({
      [TASK_ID]: {
        title: 'Unused URLs Cleanup',
        description: `Deletes unused (unaccessed for 1 year - configurable via unused_urls_cleanup.maxAge config) saved objects of type 'url' once a week.`,
        createTaskRunner: () => {
          return {
            async run() {
              runDeleteUnusedUrlsTask({
                savedObjectsRepository,
                filter,
                logger,
              });
            },
          };
        },
      },
    });

    taskManager.ensureScheduled(DELETE_UNUSED_URLS_TASK);
  }
}
