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

import { isLinkDependency } from '../utils/package_json';
import { Project } from '../utils/project';

/**
 * All external projects are located within `./plugins/{plugin}` relative
 * to the Kibana root directory or `../kibana-extra/{plugin}` relative
 * to Kibana itself.
 */
const isKibanaDep = (depVersion: string) =>
  // For ../kibana-extra/ directory (legacy only)
  depVersion.includes('../../kibana/packages/') ||
  // For plugins/ directory
  depVersion.includes('../../packages/');

/**
 * This prepares the dependencies for an _external_ project.
 */
export async function prepareExternalProjectDependencies(projectPath: string) {
  const project = await Project.fromPath(projectPath);

  if (!project.hasDependencies()) {
    return;
  }

  const deps = project.allDependencies;

  for (const depName of Object.keys(deps)) {
    const depVersion = deps[depName];

    // Kibana currently only supports `link:` dependencies on Kibana's own
    // packages, as these are packaged into the `node_modules` folder when
    // Kibana is built, so we don't need to take any action to enable
    // `require(...)` to resolve for these packages.
    if (isLinkDependency(depVersion) && !isKibanaDep(depVersion)) {
      // For non-Kibana packages we need to set up symlinks during the
      // installation process, but this is not something we support yet.
      throw new Error('This plugin is using `link:` dependencies for non-Kibana packages');
    }
  }
}
