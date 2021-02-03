/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import Crypto from 'crypto';

import { promisify } from 'util';

import execa from 'execa';

import { YarnLock, resolveDepsForProject } from './yarn_lock';
import { ProjectMap } from '../utils/projects';
import { Project } from '../utils/project';
import { Kibana } from '../utils/kibana';
import { Log } from '../utils/log';

export type ChecksumMap = Map<string, string | undefined>;
/** map of [repo relative path to changed file, type of change] */
type Changes = Map<string, 'modified' | 'deleted' | 'invalid' | 'untracked'>;

const statAsync = promisify(Fs.stat);
const projectBySpecificitySorter = (a: Project, b: Project) => b.path.length - a.path.length;

/** Get the changed files for a set of projects */
async function getChangesForProjects(projects: ProjectMap, kbn: Kibana, log: Log) {
  log.verbose('getting changed files');

  const { stdout } = await execa(
    'git',
    [
      'ls-files',
      '-dmto',
      '--exclude-standard',
      '--',
      ...Array.from(projects.values())
        .filter((p) => kbn.isPartOfRepo(p))
        .map((p) => p.path),
    ],
    {
      cwd: kbn.getAbsolute(),
    }
  );

  const output = stdout.trim();
  const unassignedChanges: Changes = new Map();

  if (output) {
    for (const line of output.split('\n')) {
      const [tag, ...pathParts] = line.trim().split(' ');
      const path = pathParts.join(' ');
      switch (tag) {
        case 'M':
        case 'C':
          // for some reason ls-files returns deleted files as both deleted
          // and modified, so make sure not to overwrite changes already
          // tracked as "deleted"
          if (unassignedChanges.get(path) !== 'deleted') {
            unassignedChanges.set(path, 'modified');
          }
          break;

        case 'R':
          unassignedChanges.set(path, 'deleted');
          break;

        case '?':
          unassignedChanges.set(path, 'untracked');
          break;

        case 'H':
        case 'S':
        case 'K':
        default:
          log.warning(`unexpected modification status "${tag}" for ${path}, please report this!`);
          unassignedChanges.set(path, 'invalid');
          break;
      }
    }
  }

  const sortedRelevantProjects = Array.from(projects.values()).sort(projectBySpecificitySorter);
  const changesByProject = new Map<Project, Changes | undefined>();

  for (const project of sortedRelevantProjects) {
    if (kbn.isOutsideRepo(project)) {
      changesByProject.set(project, undefined);
      continue;
    }

    const ownChanges: Changes = new Map();
    const prefix = kbn.getRelative(project.path);

    for (const [path, type] of unassignedChanges) {
      if (path.startsWith(prefix)) {
        ownChanges.set(path, type);
        unassignedChanges.delete(path);
      }
    }

    log.verbose(`[${project.name}] found ${ownChanges.size} changes`);
    changesByProject.set(project, ownChanges);
  }

  if (unassignedChanges.size) {
    throw new Error(
      `unable to assign all change paths to a project: ${JSON.stringify(
        Array.from(unassignedChanges.entries())
      )}`
    );
  }

  return changesByProject;
}

/** Get the latest commit sha for a project */
async function getLatestSha(project: Project, kbn: Kibana) {
  if (kbn.isOutsideRepo(project)) {
    return;
  }

  const { stdout } = await execa(
    'git',
    ['log', '-n', '1', '--pretty=format:%H', '--', project.path],
    {
      cwd: kbn.getAbsolute(),
    }
  );

  return stdout.trim() || undefined;
}

/**
 * Get the checksum for a specific project in the workspace
 */
async function getChecksum(
  project: Project,
  changes: Changes | undefined,
  yarnLock: YarnLock,
  kbn: Kibana,
  log: Log
) {
  const sha = await getLatestSha(project, kbn);
  if (sha) {
    log.verbose(`[${project.name}] local sha:`, sha);
  }

  if (!changes || Array.from(changes.values()).includes('invalid')) {
    log.warning(`[${project.name}] unable to determine local changes, caching disabled`);
    return;
  }

  const changesSummary = await Promise.all(
    Array.from(changes)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(async ([path, type]) => {
        if (type === 'deleted') {
          return `${path}:deleted`;
        }

        const stats = await statAsync(kbn.getAbsolute(path));
        log.verbose(`[${project.name}] modified time ${stats.mtimeMs} for ${path}`);
        return `${path}:${stats.mtimeMs}`;
      })
  );

  const depMap = resolveDepsForProject({
    project,
    yarnLock,
    kbn,
    log,
    includeDependentProject: false,
    productionDepsOnly: false,
  });
  if (!depMap) {
    return;
  }

  const deps = Array.from(depMap.values())
    .map(({ name, version }) => `${name}@${version}`)
    .sort((a, b) => a.localeCompare(b));

  log.verbose(`[${project.name}] resolved %d deps`, deps.length);

  const checksum = JSON.stringify(
    {
      sha,
      changes: changesSummary,
      deps,
    },
    null,
    2
  );

  if (process.env.BOOTSTRAP_CACHE_DEBUG_CHECKSUM) {
    return checksum;
  }

  const hash = Crypto.createHash('sha1');
  hash.update(checksum);
  return hash.digest('hex');
}

/**
 * Calculate checksums for all projects in the workspace based on
 *  - last git commit to project directory
 *  - un-committed changes
 *  - resolved dependencies from yarn.lock referenced by project package.json
 */
export async function getAllChecksums(kbn: Kibana, log: Log, yarnLock: YarnLock) {
  const projects = kbn.getAllProjects();
  const changesByProject = await getChangesForProjects(projects, kbn, log);

  /** map of [project.name, cacheKey] */
  const cacheKeys: ChecksumMap = new Map();

  await Promise.all(
    Array.from(projects.values()).map(async (project) => {
      cacheKeys.set(
        project.name,
        await getChecksum(project, changesByProject.get(project), yarnLock, kbn, log)
      );
    })
  );

  return cacheKeys;
}
