/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';

import { snakeCase } from './casing';
import { askQuestions, getDefaultAnswers } from './ask_questions';
import { renderTemplates } from './render_template';

export function runCli() {
  run(
    async ({ log, flags }) => {
      const name = flags.name || undefined;
      if (name && typeof name !== 'string') {
        throw createFlagError(`expected one --name flag`);
      }

      if (flags.yes && !name) {
        throw createFlagError(`passing --yes requires that you specify a name`);
      }

      const overrides = {
        name,
        ui: typeof flags.ui === 'boolean' ? flags.ui : undefined,
        server: typeof flags.server === 'boolean' ? flags.server : undefined,
      };
      const answers = flags.yes ? getDefaultAnswers(overrides) : await askQuestions(overrides);

      const outputDir = Path.resolve(REPO_ROOT, 'plugins', snakeCase(answers.name));

      if (Fs.existsSync(outputDir)) {
        throw createFailError(`Target output directory [${outputDir}] already exists`);
      }

      // process the template directory, creating the actual plugin files
      await renderTemplates({
        outputDir,
        answers,
      });

      log.success(
        `🎉\n\nYour plugin has been created in ${Path.relative(process.cwd(), outputDir)}\n`
      );
    },
    {
      usage: 'node scripts/generate_plugin',
      description: `
        Generate a fresh Kibana plugin in the plugins/ directory
      `,
      flags: {
        string: ['name'],
        boolean: ['yes', 'ui', 'server'],
        default: {
          ui: null,
          server: null,
        },
        alias: {
          y: 'yes',
          u: 'ui',
          s: 'server',
        },
        help: `
          --yes, -y          Answer yes to all prompts, requires passing --name
          --name             Set the plugin name
          --ui               Generate a UI plugin
          --server           Generate a Server plugin
        `,
      },
    }
  );
}
