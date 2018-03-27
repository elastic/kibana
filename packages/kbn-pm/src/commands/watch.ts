import chalk from 'chalk';
import { topologicallyBatchProjects, ProjectMap } from '../utils/projects';
import { parallelizeBatches } from '../utils/parallelize';
import { waitUntilWatchIsReady } from '../utils/watch';
import { Command } from './';
import { Project } from '../utils/project';

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
 *
 * Command expects two optional arguments:
 * - `-i` - projects enumerated with this option are the only ones that should be watched
 * - `-e` - projects enumerated with this option should NOT be watched at all
 */
export const WatchCommand: Command = {
  name: 'watch',
  description: 'Runs `kbn:watch` script for every project.',

  async run(projects, projectGraph, { options }) {
    const exclude = getExcludeIncludeFilter(options.e);
    const include = getExcludeIncludeFilter(options.i);

    const projectsToWatch: ProjectMap = new Map();
    for (const project of projects.values()) {
      if (shouldWatchProject(project, include, exclude)) {
        projectsToWatch.set(project.name, project);
      }
    }

    if (projectsToWatch.size === 0) {
      console.log(
        chalk.red(
          `There are no projects to watch, double check project name(s) in '-i'/'-e' arguments.`
        )
      );
      return;
    }

    const projectNames = Array.from(projectsToWatch.keys());
    console.log(
      chalk.bold(
        chalk.green(
          `Running ${watchScriptName} scripts for [${projectNames.join(', ')}].`
        )
      )
    );

    // Kibana should always be run the last, so we don't rely on automatic
    // topological batching and push it to the last one-entry batch manually.
    const shouldWatchKibanaProject = projectsToWatch.delete(kibanaProjectName);

    const batchedProjects = topologicallyBatchProjects(
      projectsToWatch,
      projectGraph
    );

    if (shouldWatchKibanaProject) {
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

function getExcludeIncludeFilter(excludeIncludeRawValue?: string | string[]) {
  if (excludeIncludeRawValue == null) {
    return [];
  }

  if (typeof excludeIncludeRawValue === 'string') {
    return [excludeIncludeRawValue];
  }

  return excludeIncludeRawValue;
}

function shouldWatchProject(
  project: Project,
  include: string[],
  exclude: string[]
) {
  // We can't watch project that doesn't have `kbn:watch` script.
  if (!project.hasScript(watchScriptName)) {
    return false;
  }

  // We shouldn't watch project if it has been specifically excluded.
  if (exclude.includes(project.name)) {
    return false;
  }

  return include.length === 0 || include.includes(project.name);
}
