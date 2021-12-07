/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import { parseDependencyTree, parseCircular, prettyCircular } from 'dpdm';
import { relative } from 'path';
import { getPluginSearchPaths } from '@kbn/config';
import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

interface Options {
  debug?: boolean;
  filter?: string;
}

type CircularDepList = Set<string>;

const allowedList: CircularDepList = new Set([]);

run(
  async ({ flags, log }) => {
    const { debug, filter } = flags as Options;
    const foundList: CircularDepList = new Set();

    const pluginSearchPathGlobs = getPluginSearchPaths({
      rootDir: REPO_ROOT,
      oss: false,
      examples: true,
    }).map((pluginFolderPath) => `${relative(REPO_ROOT, pluginFolderPath)}/**/*`);

    const depTree = await parseDependencyTree(pluginSearchPathGlobs, {
      context: REPO_ROOT,
    });

    // Build list of circular dependencies as well as the circular dependencies full paths
    const circularDependenciesFullPaths = parseCircular(depTree).filter((circularDeps) => {
      const first = circularDeps[0];
      const last = circularDeps[circularDeps.length - 1];
      const matchRegex =
        /(?<pluginFolder>(src|x-pack)\/plugins|examples|x-pack\/examples)\/(?<pluginName>[^\/]*)\/.*/;
      const firstMatch = first.match(matchRegex);
      const lastMatch = last.match(matchRegex);

      if (
        firstMatch?.groups?.pluginFolder &&
        firstMatch?.groups?.pluginName &&
        lastMatch?.groups?.pluginFolder &&
        lastMatch?.groups?.pluginName
      ) {
        const firstPlugin = `${firstMatch.groups.pluginFolder}/${firstMatch.groups.pluginName}`;
        const lastPlugin = `${lastMatch.groups.pluginFolder}/${lastMatch.groups.pluginName}`;
        const sortedPlugins = [firstPlugin, lastPlugin].sort();

        // Exclude if both plugin paths involved in the circular dependency
        // doesn't includes the provided filter
        if (filter && !firstPlugin.includes(filter) && !lastPlugin.includes(filter)) {
          return false;
        }

        if (firstPlugin !== lastPlugin) {
          foundList.add(`${sortedPlugins[0]} -> ${sortedPlugins[1]}`);
          return true;
        }
      }

      return false;
    });

    if (!debug && filter) {
      log.warning(
        dedent(`
      !!!!!!!!!!!!!! WARNING: FILTER WITHOUT DEBUG !!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! Using the --filter flag without using --debug flag    !
      ! will not allow you to see the filtered list of        !
      ! the correct results.                                  !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      `)
      );
    }

    if (debug && filter) {
      log.warning(
        dedent(`
      !!!!!!!!!!!!!!! WARNING: FILTER FLAG IS ON !!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! Be aware the following results are not complete as    !
      ! --filter flag has been passed. Ignore suggestions     !
      ! to update the allowedList or any reports of failures  !
      ! or successes.                                         !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

      The following filter has peen passed: ${filter}
      `)
      );
    }

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
      log.debug(`${prettyCircular(circularDependenciesFullPaths)}\n`);
    }

    // Always log the result of comparing the found list with the allowed list
    const diffSet = (first: CircularDepList, second: CircularDepList) =>
      new Set([...first].filter((circularDep) => !second.has(circularDep)));

    const printList = (list: CircularDepList) => {
      return Array.from(list)
        .sort()
        .reduce((listStr, entry) => {
          return listStr ? `${listStr}\n'${entry}',` : `'${entry}',`;
        }, '');
    };

    const foundDifferences = diffSet(foundList, allowedList);

    if (debug && !foundDifferences.size) {
      log.debug(
        dedent(`
      !!!!!!!!!!!!!!!!! UP TO DATE ALLOWED LIST !!!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! The declared circular dependencies allowed list is up    !
      ! to date and includes every plugin listed in above paths. !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

      The allowed circular dependencies list is (#${allowedList.size}):
      ${printList(allowedList)}
      `)
      );
    }

    if (foundDifferences.size > 0) {
      log.error(
        dedent(`
      !!!!!!!!!!!!!!!!! OUT OF DATE ALLOWED LIST !!!!!!!!!!!!!!!!!
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      ! The declared circular dependencies allowed list is out   !
      ! of date. Please run the following locally to know more:  !
      !                                                          !
      ! 'node scripts/find_plugins_with_circular_deps --debug'   !
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

      The allowed circular dependencies list is (#${allowedList.size}):
      ${printList(allowedList)}

      The found circular dependencies list is (#${foundList.size}):
      ${printList(foundList)}

      The differences between both are (#${foundDifferences.size}):
      ${printList(foundDifferences)}

      FAILED: circular dependencies in the allowed list declared on the file '${__filename}' did not match the found ones.
      `)
      );

      process.exit(1);
    }

    log.success('None non allowed circular dependencies were found');
  },
  {
    description:
      'Searches circular dependencies between plugins located under src/plugins, x-pack/plugins, examples and x-pack/examples',
    flags: {
      boolean: ['debug'],
      string: ['filter'],
      default: {
        debug: false,
      },
      help: `
        --debug            Run the script in debug mode which enables detailed path logs for circular dependencies
        --filter           It will only include in the results circular deps where the plugin paths contains parts of the passed string in the filter
      `,
    },
  }
);
