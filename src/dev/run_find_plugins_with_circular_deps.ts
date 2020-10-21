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
import { parseDependencyTree, parseCircular, prettyCircular } from 'dpdm';
import { run } from '@kbn/dev-utils';

interface Options {
  ci?: boolean;
}

const allowedList = {};

run(
  async ({ flags, log }) => {
    const { ci = false } = flags as Options;
    const foundList: any = {};
    const depTree = await parseDependencyTree(['{src,x-pack}/plugins/**/*'], {
      include: /(src|x-pack)\/plugins\/.*/,
    });

    // Build list of circular dependencies as well as the circular dependencies full paths
    const circularDependenciesFullPaths = parseCircular(depTree).filter((circularDeps) => {
      const first = circularDeps[0];
      const last = circularDeps[circularDeps.length - 1];
      const firstMatch = first.match(/(src|x-pack)\/plugins\/([^\/]*)\/.*/);
      const lastMatch = last.match(/(src|x-pack)\/plugins\/([^\/]*)\/.*/);

      if (firstMatch && lastMatch && firstMatch.length === 3 && lastMatch.length === 3) {
        const firstPlugin = `${firstMatch[1]}/plugins/${firstMatch[2]}`;
        const lastPlugin = `${lastMatch[1]}/plugins/${lastMatch[2]}`;

        if (firstPlugin !== lastPlugin) {
          foundList[firstPlugin] = lastPlugin;
          return true;
        }
      }

      return false;
    });

    // Log the full circular dependencies path if we are not on CI
    if (!ci && circularDependenciesFullPaths.length > 0) {
      log.error(
        dedent(`
      !!!!!!!!!!!!!! CIRCULAR DEPENDENCIES FOUND !!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! Circular dependencies were found, you can find below  !
      ! all the paths involved.                               !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      `)
      );
      log.error(prettyCircular(circularDependenciesFullPaths));
    }

    // Always log the result of comparing the found list with the allowed list
  },
  {
    flags: {
      boolean: ['ci'],
      default: {
        ci: false,
      },
      allowUnexpected: false,
      help: `
        --ci            Run the script in CI mode
      `,
    },
  }
);
