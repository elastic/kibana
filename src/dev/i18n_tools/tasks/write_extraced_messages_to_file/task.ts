/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PRESET_TIMER } from 'listr2';
import type { TaskSignature } from '../../types';

import { ErrorReporter } from '../../utils/error_reporter';
import { writeToFile } from '../../utils';
import { serializeToJson } from '../../serializers';

export interface TaskOptions {
  outputDir: string;
}

export const writeExtractedMessagesToFile: TaskSignature<TaskOptions> = (
  context,
  task,
  options
) => {
  const { config } = context;
  const { outputDir } = options;
  const errorReporter = new ErrorReporter({ name: 'Write Translation Files' });

  if (!config || !Object.keys(config.paths).length) {
    throw errorReporter.reportFailure(
      'None of input paths is covered by the mappings in .i18nrc.json'
    );
  }

  return task.newListr(
    (parent) => [
      {
        title: `Writing Translation Files`,
        task: async () => {
          try {
            const sortedMessages = [...context.messages.values()]
              .flat()
              .sort(({ id: key1 }, { id: key2 }) => key1.localeCompare(key2));

            const fileJsonContent = serializeToJson(sortedMessages);
            const { outputFilePath } = await writeToFile(outputDir, 'en.json', fileJsonContent);

            parent.title = `Successfully wrote file ${outputFilePath}`;
          } catch (err) {
            throw err;
          }
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'full' }
  );
};
