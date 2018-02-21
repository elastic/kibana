import del from 'del';
import { relative, resolve, join } from 'path';
import copy from 'cpy';

import { getProjectPaths } from '../config';
import {
  getProjects,
  buildProjectGraph,
  topologicallyBatchProjects,
} from '../utils/projects';
import {
  createProductionPackageJson,
  writePackageJson,
  readPackageJson,
} from '../utils/package_json';
import { isDirectory, isFile } from '../utils/fs';
import { Project } from '../utils/project';

export async function buildProductionProjects({
  kibanaRoot,
  buildRoot,
}: {
  kibanaRoot: string;
  buildRoot: string;
}) {
  const projectPaths = getProjectPaths(kibanaRoot, {
    'skip-kibana': true,
    'skip-kibana-extra': true,
  });

  const projects = await getProductionProjects(kibanaRoot, projectPaths);
  const projectGraph = buildProjectGraph(projects);
  const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

  const projectNames = [...projects.values()].map(project => project.name);
  console.log(`Preparing production build for [${projectNames.join(', ')}]`);

  for (const batch of batchedProjects) {
    for (const project of batch) {
      await deleteTarget(project);
      await buildProject(project);
      await copyToBuild(project, kibanaRoot, buildRoot);
    }
  }
}

/**
 * Returns only the projects that should be built into the production bundle
 */
async function getProductionProjects(
  kibanaRoot: string,
  projectPaths: string[]
) {
  const projects = await getProjects(kibanaRoot, projectPaths);

  const buildProjects = new Map();
  for (const [name, project] of projects.entries()) {
    if (!project.skipFromBuild()) {
      buildProjects.set(name, project);
    }
  }

  return buildProjects;
}

async function deleteTarget(project: Project) {
  const targetDir = project.targetLocation;

  if (await isDirectory(targetDir)) {
    await del(targetDir, { force: true });
  }
}

async function buildProject(project: Project) {
  if (project.hasScript('build')) {
    await project.runScript('build');
  }
}

async function copyToBuild(
  project: Project,
  kibanaRoot: string,
  buildRoot: string
) {
  // We want the package to have the same relative location within the build
  const relativeProjectPath = relative(kibanaRoot, project.path);
  const buildProjectPath = resolve(buildRoot, relativeProjectPath);

  // When copying all the files into the build, we exclude `node_modules`
  // because we want the Kibana build to actually install all dependencies. The
  // primary reason for allowing the Kibana build process to install the
  // dependencies is that it will "dedupe" them, so we don't include unnecessary
  // copies of dependencies.
  await copy(['**/*', '!node_modules/**'], buildProjectPath, {
    cwd: project.getIntermediateBuildDirectory(),
    parents: true,
    nodir: true,
    dot: true,
  });

  // When a project is using an intermediate build directory, they might copy
  // the `package.json` into that directory. If so, we want to use that as the
  // basis for creating the production-ready `package.json`. Otherwise we fall
  // back to using the project's already defined `package.json`.
  const packageJson = (await isFile(join(buildProjectPath, 'package.json')))
    ? await readPackageJson(buildProjectPath)
    : project.json;

  const preparedPackageJson = createProductionPackageJson(packageJson);
  await writePackageJson(buildProjectPath, preparedPackageJson);
}
