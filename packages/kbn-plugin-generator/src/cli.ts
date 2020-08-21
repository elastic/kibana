/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import Fs from 'fs';

import execa from 'execa';
import { REPO_ROOT, run, createFailError, createFlagError } from '@kbn/dev-utils';

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

      const outputDir = answers.internal
        ? Path.resolve(answers.internalLocation, snakeCase(answers.name))
        : Path.resolve(REPO_ROOT, 'plugins', snakeCase(answers.name));

      if (Fs.existsSync(outputDir)) {
        throw createFailError(`Target output directory [${outputDir}] already exists`);
      }

      // process the template directory, creating the actual plugin files
      await renderTemplates({
        outputDir,
        answers,
      });

      // init git repo in third party plugins
      if (!answers.internal) {
        await execa('git', ['init', outputDir]);
      }

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
