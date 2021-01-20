/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CliError } from '../utils/errors';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { ProjectMap, topologicallyBatchProjects } from '../utils/projects';
import { waitUntilWatchIsReady } from '../utils/watch';
import { ICommand } from './';

/**
 * Name of the script in the package/project package.json file to run during `kbn watch`.
 */
const watchScriptName = 'kbn:watch';

/**
 * Name of the Kibana project.
 */
const kibanaProjectName = 'kibana';

/**
 * Command that traverses through list of available projects/packages that have `kbn:watch` script in their
 * package.json files, groups them into topology aware batches and then processes theses batches one by one
 * running `kbn:watch` scripts in parallel within the same batch.
 *
 * Command internally relies on the fact that most of the build systems that are triggered by `kbn:watch`
 * will emit special "marker" once build/watch process is ready that we can use as completion condition for
 * the `kbn:watch` script and eventually for the entire batch. Currently we support completion "markers" for
 * `webpack` and `tsc` only, for the rest we rely on predefined timeouts.
 */
export const WatchCommand: ICommand = {
  description: 'Runs `kbn:watch` script for every project.',
  name: 'watch',

  async run(projects, projectGraph) {
    const projectsToWatch: ProjectMap = new Map();
    for (const project of projects.values()) {
      // We can't watch project that doesn't have `kbn:watch` script.
      if (project.hasScript(watchScriptName)) {
        projectsToWatch.set(project.name, project);
      }
    }

    if (projectsToWatch.size === 0) {
      throw new CliError(
        `There are no projects to watch found. Make sure that projects define 'kbn:watch' script in 'package.json'.`
      );
    }

    const projectNames = Array.from(projectsToWatch.keys());
    log.info(`Running ${watchScriptName} scripts for [${projectNames.join(', ')}].`);

    // Kibana should always be run the last, so we don't rely on automatic
    // topological batching and push it to the last one-entry batch manually.
    const shouldWatchKibanaProject = projectsToWatch.delete(kibanaProjectName);

    const batchedProjects = topologicallyBatchProjects(projectsToWatch, projectGraph);

    if (shouldWatchKibanaProject) {
      batchedProjects.push([projects.get(kibanaProjectName)!]);
    }

    await parallelizeBatches(batchedProjects, async (pkg) => {
      const completionHint = await waitUntilWatchIsReady(
        pkg.runScriptStreaming(watchScriptName, {
          debug: false,
        }).stdout! // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
      );

      log.success(`[${pkg.name}] Initial build completed (${completionHint}).`);
    });
  },
};
