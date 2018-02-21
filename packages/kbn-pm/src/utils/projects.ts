import _glob from 'glob';
import path from 'path';
import { promisify } from 'bluebird';

import { CliError } from './errors';
import { Project } from './project';

// Correct overload version of _glob can't be inferred automatically so we
// should explicitly point to the right version with type parameters.
const glob = promisify<string[], string, _glob.IOptions>(_glob);

export type ProjectMap = Map<string, Project>;
export type ProjectGraph = Map<string, Project[]>;

export async function getProjects(
  rootPath: string,
  projectsPathsPatterns: string[]
) {
  const projects: ProjectMap = new Map();

  for (const pattern of projectsPathsPatterns) {
    const pathsToProcess = await packagesFromGlobPattern({ pattern, rootPath });

    for (const filePath of pathsToProcess) {
      const projectConfigPath = normalize(filePath);
      const projectDir = path.dirname(projectConfigPath);
      const project = await Project.fromPath(projectDir);

      if (projects.has(project.name)) {
        throw new CliError(
          `There are multiple projects with the same name [${project.name}]`,
          {
            name: project.name,
            paths: [project.path, projects.get(project.name)!.path],
          }
        );
      }

      projects.set(project.name, project);
    }
  }

  return projects;
}

function packagesFromGlobPattern({
  pattern,
  rootPath,
}: {
  pattern: string;
  rootPath: string;
}) {
  const globOptions = {
    cwd: rootPath,

    // Should throw in case of unusual errors when reading the file system
    strict: true,

    // Always returns absolute paths for matched files
    absolute: true,

    // Do not match ** against multiple filenames
    // (This is only specified because we currently don't have a need for it.)
    noglobstar: true,
  };

  return glob(path.join(pattern, 'package.json'), globOptions);
}

// https://github.com/isaacs/node-glob/blob/master/common.js#L104
// glob always returns "\\" as "/" in windows, so everyone
// gets normalized because we can't have nice things.
function normalize(dir: string) {
  return path.normalize(dir);
}

export function buildProjectGraph(projects: ProjectMap) {
  const projectGraph: ProjectGraph = new Map();

  for (const project of projects.values()) {
    const projectDeps = [];
    const dependencies = project.allDependencies;

    for (const depName of Object.keys(dependencies)) {
      if (projects.has(depName)) {
        const dep = projects.get(depName)!;

        project.ensureValidProjectDependency(dep);

        projectDeps.push(dep);
      }
    }

    projectGraph.set(project.name, projectDeps);
  }

  return projectGraph;
}

export function topologicallyBatchProjects(
  projectsToBatch: ProjectMap,
  projectGraph: ProjectGraph
) {
  // We're going to be chopping stuff out of this array, so copy it.
  const projects = [...projectsToBatch.values()];

  // This maps project names to the number of projects that depend on them.
  // As projects are completed their names will be removed from this object.
  const refCounts: { [k: string]: number } = {};
  projects.forEach(pkg =>
    projectGraph.get(pkg.name)!.forEach(dep => {
      if (!refCounts[dep.name]) refCounts[dep.name] = 0;
      refCounts[dep.name]++;
    })
  );

  const batches = [];
  while (projects.length > 0) {
    // Get all projects that have no remaining dependencies within the repo
    // that haven't yet been picked.
    const batch = projects.filter(pkg => {
      const projectDeps = projectGraph.get(pkg.name)!;
      return projectDeps.filter(dep => refCounts[dep.name] > 0).length === 0;
    });

    // If we weren't able to find a project with no remaining dependencies,
    // then we've encountered a cycle in the dependency graph.
    const hasCycles = projects.length > 0 && batch.length === 0;
    if (hasCycles) {
      const cycleProjectNames = projects.map(p => p.name);
      const message =
        'Encountered a cycle in the dependency graph. Projects in cycle are:\n' +
        cycleProjectNames.join(', ');

      throw new CliError(message);
    }

    batches.push(batch);

    batch.forEach(pkg => {
      delete refCounts[pkg.name];
      projects.splice(projects.indexOf(pkg), 1);
    });
  }

  return batches;
}
