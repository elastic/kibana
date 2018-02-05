import _glob from 'glob';
import path from 'path';
import promisify from 'pify';

import { CliError } from './errors';
import { Project } from './project';

const glob = promisify(_glob);

export async function getProjects(rootPath, projectsPaths) {
  const globOpts = {
    cwd: rootPath,

    // Should throw in case of unusual errors when reading the file system
    strict: true,

    // Always returns absolute paths for matched files
    absolute: true,

    // Do not match ** against multiple filenames
    // (This is only specified because we currently don't have a need for it.)
    noglobstar: true,
  };
  const projects = new Map();

  for (const globPath of projectsPaths) {
    const files = await glob(path.join(globPath, 'package.json'), globOpts);

    for (const filePath of files) {
      const projectConfigPath = normalize(filePath);
      const projectDir = path.dirname(projectConfigPath);
      const project = await Project.fromPath(projectDir);

      if (projects.has(project.name)) {
        throw new CliError(
          `There are multiple projects with the same name [${project.name}]`,
          {
            name: project.name,
            paths: [project.path, projects.get(project.name).path],
          }
        );
      }

      projects.set(project.name, project);
    }
  }

  return projects;
}

// https://github.com/isaacs/node-glob/blob/master/common.js#L104
// glob always returns "\\" as "/" in windows, so everyone
// gets normalized because we can't have nice things.
function normalize(dir) {
  return path.normalize(dir);
}

export function buildProjectGraph(projects) {
  const projectGraph = new Map();

  for (const project of projects.values()) {
    const projectDeps = [];
    const dependencies = project.allDependencies;

    for (const depName of Object.keys(dependencies)) {
      if (projects.has(depName)) {
        const dep = projects.get(depName);

        project.ensureValidProjectDependency(dep);

        projectDeps.push(dep);
      }
    }

    projectGraph.set(project.name, projectDeps);
  }

  return projectGraph;
}

export function topologicallyBatchProjects(projectsToBatch, projectGraph) {
  // We're going to be chopping stuff out of this array, so copy it.
  const projects = [...projectsToBatch.values()];

  // This maps project names to the number of projects that depend on them.
  // As projects are completed their names will be removed from this object.
  const refCounts = {};
  projects.forEach(pkg =>
    projectGraph.get(pkg.name).forEach(dep => {
      if (!refCounts[dep.name]) refCounts[dep.name] = 0;
      refCounts[dep.name]++;
    })
  );

  const batches = [];
  while (projects.length > 0) {
    // Get all projects that have no remaining dependencies within the repo
    // that haven't yet been picked.
    const batch = projects.filter(pkg => {
      const projectDeps = projectGraph.get(pkg.name);
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
