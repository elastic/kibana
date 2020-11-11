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
import { differenceWith, fromPairs, isEqual, toPairs } from 'lodash';
import { run } from '@kbn/dev-utils';

interface Options {
  debug?: boolean;
}

interface CircularDepList {
  [key: string]: string;
}

const allowedList: CircularDepList = {
  'src/plugins/data': 'src/plugins/expressions',
  'src/plugins/expressions': 'src/plugins/visualizations',
  'src/plugins/home': 'src/plugins/discover',
  'src/plugins/ui_actions': 'src/plugins/embeddable',
  'src/plugins/vis_default_editor': 'src/plugins/visualize',
  'src/plugins/visualizations': 'src/plugins/vis_default_editor',
  'x-pack/plugins/apm': 'x-pack/plugins/infra',
  'x-pack/plugins/lists': 'x-pack/plugins/security_solution',
  'x-pack/plugins/security': 'x-pack/plugins/spaces',
};

run(
  async ({ flags, log }) => {
    const { debug = false } = flags as Options;
    const foundList: CircularDepList = {};
    const depTree = await parseDependencyTree(
      ['{src,x-pack}/plugins/**/*', '{x-pack/examples,examples}/**/*'],
      {
        include: /((src|x-pack)\/plugins|examples|x-pack\/examples)\/.*/,
      }
    );

    // Build list of circular dependencies as well as the circular dependencies full paths
    const circularDependenciesFullPaths = parseCircular(depTree).filter((circularDeps) => {
      const first = circularDeps[0];
      const last = circularDeps[circularDeps.length - 1];
      const firstMatch = first.match(
        /((src|x-pack)\/plugins|examples|x-pack\/examples)\/([^\/]*)\/.*/
      );
      const lastMatch = last.match(
        /((src|x-pack)\/plugins|examples|x-pack\/examples)\/([^\/]*)\/.*/
      );

      if (firstMatch && lastMatch && firstMatch.length === 3 && lastMatch.length === 3) {
        const firstPlugin = `${firstMatch[0]}/${firstMatch[2]}`;
        const lastPlugin = `${lastMatch[0]}/${lastMatch[2]}`;

        if (firstPlugin !== lastPlugin) {
          foundList[firstPlugin] = lastPlugin;
          return true;
        }
      }

      return false;
    });

    // Log the full circular dependencies path if we are under debug flag
    if (debug && circularDependenciesFullPaths.length > 0) {
      log.debug(
        dedent(`
      !!!!!!!!!!!!!! CIRCULAR DEPENDENCIES FOUND !!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! Circular dependencies were found, you can find below  !
      ! all the paths involved.                               !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      `)
      );
      log.debug(prettyCircular(circularDependenciesFullPaths));
    }

    // Always log the result of comparing the found list with the allowed list
    const diffObject = (first: CircularDepList, second: CircularDepList) =>
      fromPairs(differenceWith(toPairs(first), toPairs(second), isEqual));

    const printList = (list: CircularDepList) => {
      return Object.keys(list).reduce((listStr, key) => {
        return listStr ? `${listStr}\n${key} -> ${list[key]}` : `${key} -> ${list[key]}`;
      }, '');
    };

    const foundDifferences = diffObject(foundList, allowedList);

    if (Object.keys(foundDifferences).length > 0) {
      log.error(
        dedent(`
      !!!!!!!!!!!!!!!!! OUT OF DATE ALLOWED LIST !!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! The declared circular dependencies allowed list is out   !
      ! of date. Please run the following locally to know more:  !
      !                                                          !
      ! 'node scripts/find_plugins_with_circular_deps --debug'   !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

      The allowed circular dependencies list is:
      ${printList(allowedList)}

      The found circular dependencies list is:
      ${printList(foundList)}

      The differences between both are:
      ${printList(foundDifferences)}
      `)
      );
      return;
    }

    log.success('None non allowed circular dependencies were found');
  },
  {
    description:
      'Searches circular dependencies between plugins located under src/plugins, x-pack/plugins, examples and x-pack/examples',
    flags: {
      boolean: ['debug'],
      default: {
        debug: false,
      },
      help: `
        --debug            Run the script in debug mode which enables detailed path logs for circular dependencies
      `,
    },
  }
);
