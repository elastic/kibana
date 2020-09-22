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

// @ts-expect-error published types are worthless
import { stringify as stringifyLockfile } from '@yarnpkg/lockfile';
import dedent from 'dedent';

import { linkProjectExecutables } from '../utils/link_project_executables';
import { log } from '../utils/log';
import { parallelizeBatches } from '../utils/parallelize';
import { topologicallyBatchProjects } from '../utils/projects';
import { Project } from '../utils/project';
import { ICommand } from './';
import { getAllChecksums } from '../utils/project_checksums';
import { BootstrapCacheFile } from '../utils/bootstrap_cache_file';
import { readYarnLock, YarnLock } from '../utils/yarn_lock';
import { Kibana } from '../utils/kibana';
import { writeFile } from '../utils/fs';

export const BootstrapCommand: ICommand = {
  description: 'Install dependencies and crosslink projects',
  name: 'bootstrap',

  async run(projects, projectGraph, { options, kbn }) {
    const batchedProjectsByWorkspace = topologicallyBatchProjects(projects, projectGraph, {
      batchByWorkspace: true,
    });
    const batchedProjects = topologicallyBatchProjects(projects, projectGraph);

    const extraArgs = [
      ...(options['frozen-lockfile'] === true ? ['--frozen-lockfile'] : []),
      ...(options['prefer-offline'] === true ? ['--prefer-offline'] : []),
    ];

    for (const batch of batchedProjectsByWorkspace) {
      for (const project of batch) {
        if (project.isWorkspaceProject) {
          log.verbose(`Skipping workspace project: ${project.name}`);
          continue;
        }

        if (project.hasDependencies()) {
          await project.installDependencies({ extraArgs });
        }
      }
    }

    const yarnLock = await readYarnLock(kbn);

    await assertSingleLodashV4(kbn, yarnLock);
    await assertNoProductionLodash3(kbn, yarnLock);
    log.success('yarn.lock analysis completed without any issues');

    await linkProjectExecutables(projects, projectGraph);

    /**
     * At the end of the bootstrapping process we call all `kbn:bootstrap` scripts
     * in the list of projects. We do this because some projects need to be
     * transpiled before they can be used. Ideally we shouldn't do this unless we
     * have to, as it will slow down the bootstrapping process.
     */

    const checksums = await getAllChecksums(kbn, log, yarnLock);
    const caches = new Map<Project, { file: BootstrapCacheFile; valid: boolean }>();
    let cachedProjectCount = 0;

    for (const project of projects.values()) {
      if (project.hasScript('kbn:bootstrap')) {
        const file = new BootstrapCacheFile(kbn, project, checksums);
        const valid = options.cache && file.isValid();

        if (valid) {
          log.debug(`[${project.name}] cache up to date`);
          cachedProjectCount += 1;
        }

        caches.set(project, { file, valid });
      }
    }

    if (cachedProjectCount > 0) {
      log.success(`${cachedProjectCount} bootstrap builds are cached`);
    }

    await parallelizeBatches(batchedProjects, async (project) => {
      const cache = caches.get(project);
      if (cache && !cache.valid) {
        log.info(`[${project.name}] running [kbn:bootstrap] script`);
        cache.file.delete();
        await project.runScriptStreaming('kbn:bootstrap');
        cache.file.write();
        log.success(`[${project.name}] bootstrap complete`);
      }
    });
  },
};

async function assertSingleLodashV4(kbn: Kibana, yarnLock: YarnLock) {
  const lodash4Versions = new Set<string>();
  const lodash4Reqs = new Set<string>();
  for (const [req, dep] of Object.entries(yarnLock)) {
    const chunks = req.split('@');
    if (chunks[0] === 'lodash' && dep.version.startsWith('4.')) {
      lodash4Reqs.add(req);
      lodash4Versions.add(dep.version);
    }
  }

  if (lodash4Versions.size === 1) {
    return;
  }

  for (const req of lodash4Reqs) {
    delete yarnLock[req];
  }

  await writeFile(kbn.getAbsolute('yarn.lock'), stringifyLockfile(yarnLock), 'utf8');

  log.error(dedent`

    Multiple version of lodash v4 were detected, so they have been removed
    from the yarn.lock file. Please rerun yarn kbn bootstrap to coalese the
    lodash versions installed.

    If you still see this error when you re-bootstrap then you might need
    to force a new dependency to use the latest version of lodash via the
    "resolutions" field in package.json.

    If you have questions about this please reach out to the operations team.

  `);

  process.exit(1);
}

async function assertNoProductionLodash3(kbn: Kibana, yarnLock: YarnLock) {
  const prodDependencies = kbn.resolveAllProductionDependencies(yarnLock, log);

  const lodash3Versions = new Set<string>();
  for (const dep of prodDependencies.values()) {
    if (dep.name === 'lodash' && dep.version.startsWith('3.')) {
      lodash3Versions.add(dep.version);
    }
  }

  if (!lodash3Versions.size) {
    return;
  }

  log.error(dedent`

    Due to changes in the yarn.lock file and/or package.json files a version of
    lodash 3 is now included in the production dependencies. To reduce the size of
    our distributable and especially our front-end bundles we have decided to
    prevent adding any new instances of lodash 3.

    Please inspect the changes to yarn.lock or package.json files to identify where
    the lodash 3 version is coming from and remove it.

    If you have questions about this please reack out to the operations team.

  `);

  process.exit(1);
}
