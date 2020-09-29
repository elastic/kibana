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

import dedent from 'dedent';
import globby from 'globby';
import { readFileSync } from 'fs';
import { createFailError, run } from '@kbn/dev-utils';

function addPackage(
  parsedDependencies: { [key: string]: Array<{ path: string; version: string }> },
  name: string,
  version: string,
  packagePath: string
) {
  if (version.match(/link:/)) return;

  if (!parsedDependencies[name]) {
    parsedDependencies[name] = [];
  }

  parsedDependencies[name].push({
    path: packagePath,
    version,
  });
}

function checkPackages(
  parsedDependencies: { [key: string]: Array<{ path: string; version: string }> },
  packages: { [key: string]: string },
  packagePath: string
) {
  if (!packages) return;

  for (const [name, version] of Object.entries(packages)) {
    addPackage(parsedDependencies, name, version, packagePath);
  }
}

run(async ({ log }) => {
  const packagePaths = await globby(['**/package.json'], { gitignore: true });
  const parsedDependencies: { [key: string]: Array<{ path: string; version: string }> } = {};

  packagePaths.forEach((packagePath) => {
    try {
      const pkg = JSON.parse(readFileSync(packagePath).toString());

      checkPackages(parsedDependencies, pkg.dependencies, packagePath);
      checkPackages(parsedDependencies, pkg.devDependencies, packagePath);
    } catch (e) {
      throw createFailError(`failed to parse ${packagePath}`, e.message);
    }
  });

  const dependenciesWithMultipleVersions = Object.keys(parsedDependencies).reduce(
    (errStr, name) => {
      const dependency = parsedDependencies[name];
      const unique = [...new Set(dependency.map((d) => d.version))];

      if (unique.length > 1) {
        errStr = errStr + `${name} (${unique.join(',')})\n`;
        dependency.forEach((d) => (errStr = errStr + `  - ${d.path}@${d.version}\n`));
      }
      return errStr;
    },
    ''
  );

  if (dependenciesWithMultipleVersions) {
    throw createFailError(
      dedent(`

      [single_version_dependencies] Multiple versions for the same dependency
      were found declared across different package.json files. Please consolidate
      those into the same version as declaring different versions for the
      same dependency is not supported.

      If you have questions about this please reach out to the operations team.

      The conflicting dependencies are:

      ${dependenciesWithMultipleVersions}
    `)
    );
  }

  log.success(
    '[single_version_dependencies] dependency versions are consistent across the entire project.'
  );
});
