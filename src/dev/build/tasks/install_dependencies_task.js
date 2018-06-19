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

import { exec } from '../lib';

export const InstallDependenciesTask = {
  description: 'Installing node_modules, including production builds of packages',

  async run(config, log, build) {
    // We're using `pure-lockfile` instead of `frozen-lockfile` because we
    // rewrite `link:` dependencies to `file:` dependencies earlier in the
    // build. This means the lockfile won't be consistent, so instead of
    // verifying it, we just skip writing a new lockfile. However, this does
    // still use the existing lockfile for dependency resolution.

    // We're using --no-bin-links to support systems that don't have symlinks.
    // This is commonly seen in shared folders on virtual machines
    const args = ['--production', '--ignore-optional', '--pure-lockfile', '--no-bin-links'];

    await exec(log, 'yarn', args, {
      cwd: build.resolvePath(),
    });
  },
};
