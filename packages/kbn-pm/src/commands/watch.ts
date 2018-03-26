import chalk from 'chalk';
import { topologicallyBatchProjects, ProjectMap } from '../utils/projects';
import { parallelizeBatches } from '../utils/parallelize';
import { waitUntilWatchIsReady } from '../utils/watch';
import { Command } from './';

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
export const WatchCommand: Command = {
  name: 'watch',
  description: 'Runs `kbn:watch` script for every project.',

  async run(projects, projectGraph) {
    const projectsWithWatchScript: ProjectMap = new Map();
    for (const project of projects.values()) {
      if (project.hasScript(watchScriptName)) {
        projectsWithWatchScript.set(project.name, project);
      }
    }

    const projectNames = Array.from(projectsWithWatchScript.keys());
    console.log(
      chalk.bold(
        chalk.green(
          `Running ${watchScriptName} scripts for [${projectNames.join(', ')}].`
        )
      )
    );

    // Kibana should always be run the last, so we don't rely on automatic
    // topological batching and push it to the last one-entry batch manually.
    projectsWithWatchScript.delete(kibanaProjectName);

    const batchedProjects = topologicallyBatchProjects(
      projectsWithWatchScript,
      projectGraph
    );

    if (projects.has(kibanaProjectName)) {
      batchedProjects.push([projects.get(kibanaProjectName)!]);
    }

    await parallelizeBatches(batchedProjects, async pkg => {
      const completionHint = await waitUntilWatchIsReady(
        pkg.runScriptStreaming(watchScriptName).stdout
      );

      console.log(
        chalk.bold(
          `[${chalk.green(
            pkg.name
          )}] Initial build completed (${completionHint}).`
        )
      );
    });
  },
};
