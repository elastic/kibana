/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { Repos } from './repos';
import { Config, Source } from './config';
import { quietFail } from './error';

run(
  async ({ log, flagsReader }) => {
    const cloneOnly = flagsReader.boolean('clone-only');

    const repos = new Repos(log);
    const docsRepo = await repos.init('elastic/docs.elastic.dev');
    const contentConfig = new Config(docsRepo);
    const sources = contentConfig.getSources().filter((s) => s.location !== 'elastic/kibana');

    if (sources.some((s) => s.type !== 'github')) {
      throw createFailError(
        'expected all content.js sources from docs.elastic.dev to have "type: github"'
      );
    }

    const localCloneSources = await Promise.all(
      sources.map(async (source): Promise<Source> => {
        const repo = await repos.init(source.location);

        return {
          type: 'file',
          location: repo.resolve(),
        };
      })
    );

    if (cloneOnly) {
      log.success('cloned repos');
      return;
    }

    log.info('[docs.elastic.dev] updated sources to point to local repos');
    contentConfig.setSources([
      ...localCloneSources,
      {
        type: 'file',
        location: REPO_ROOT,
      },
    ]);

    const showOutput = flagsReader.boolean('debug') || flagsReader.boolean('verbose');
    try {
      log.info('[docs.elastic.dev] installing deps with yarn');
      await docsRepo.run('yarn', [], { desc: 'yarn install', showOutput });

      log.info('[docs.elastic.dev] initializing docsmobile');
      await docsRepo.run('yarn', ['docsmobile', 'init'], {
        desc: 'yarn docsmobile init',
        showOutput,
      });

      log.info('[docs.elastic.dev] building');
      await docsRepo.run('yarn', ['build'], { desc: 'yarn build', showOutput });
    } catch {
      quietFail(`failed to build docs`);
    }

    log.success('docs built successfully');
  },
  {
    flags: {
      boolean: ['clone-only'],
      help: `
        --clone-only       Simply clone the repos, used to populate the worker images
      `,
    },
  }
);
