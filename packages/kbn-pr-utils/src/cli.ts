/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  RunWithCommands,
  RunContext,
  Command as GenericCommand,
  createFailError,
} from '@kbn/dev-utils';
import { PrApi } from './pr_api';
import { ForceEsDocFailuresCommand } from './commands/force_es_doc_failures';

/**
 * Define additional properties attached to the runContext which will be provided to all commands
 */
function extendContext({ flags, log }: RunContext) {
  const token = flags['github-token'] || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token || typeof token !== 'string') {
    throw createFailError(
      '--github-token, or $GH_TOKEN/$GITHUB_TOKEN environment variable is required'
    );
  }

  const api = new PrApi(log, token);

  return {
    api,
  };
}

type ContextExtension = ReturnType<typeof extendContext>;
export type Command = GenericCommand<ContextExtension>;

export function runPrUtilsCli() {
  new RunWithCommands(
    {
      description: 'CLI for automating some PR maintenance tasks',
      globalFlags: {
        string: ['github-token'],
        help: `
          --github-token     Token used to talk to the Github API. Defaults to GH_TOKEN or GITHUB_TOKEN environment variable.
        `,
      },
      extendContext,
    },
    [ForceEsDocFailuresCommand]
  ).execute();
}
