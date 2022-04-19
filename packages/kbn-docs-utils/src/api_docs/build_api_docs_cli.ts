/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { run, createFlagError } from '@kbn/dev-utils';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/utils';
import { Project } from 'ts-morph';

import { writePluginDocs } from './mdx/write_plugin_mdx_docs';
import { ApiDeclaration, ApiStats, PluginMetaInfo } from './types';
import { findPlugins } from './find_plugins';
import { pathsOutsideScopes } from './build_api_declarations/utils';
import { getPluginApiMap } from './get_plugin_api_map';
import { writeDeprecationDocByApi } from './mdx/write_deprecations_doc_by_api';
import { writeDeprecationDocByPlugin } from './mdx/write_deprecations_doc_by_plugin';
import { writePluginDirectoryDoc } from './mdx/write_plugin_directory_doc';
import { collectApiStatsForPlugin } from './stats';
import { countEslintDisableLine, EslintDisableCounts } from './count_eslint_disable';
import { writeDeprecationDueByTeam } from './mdx/write_deprecations_due_by_team';

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

export function runBuildApiDocsCli() {
  run(
    async ({ log, flags }) => {
      const stats = flags.stats && typeof flags.stats === 'string' ? [flags.stats] : flags.stats;
      const pluginFilter =
        flags.plugin && typeof flags.plugin === 'string' ? [flags.plugin] : flags.plugin;

      if (pluginFilter && !isStringArray(pluginFilter)) {
        throw createFlagError('expected --plugin must only contain strings');
      }

      if (
        (stats &&
          isStringArray(stats) &&
          stats.find((s) => s !== 'any' && s !== 'comments' && s !== 'exports')) ||
        (stats && !isStringArray(stats))
      ) {
        throw createFlagError(
          'expected --stats must only contain `any`, `comments` and/or `exports`'
        );
      }

      const project = getTsProject(REPO_ROOT);

      const plugins = findPlugins();

      const outputFolder = Path.resolve(REPO_ROOT, 'api_docs');
      if (!Fs.existsSync(outputFolder)) {
        Fs.mkdirSync(outputFolder);

        // Don't delete all the files if a plugin filter is being used.
      } else if (!pluginFilter) {
        // Delete all files except the README that warns about the auto-generated nature of
        // the folder.
        const files = Fs.readdirSync(outputFolder);
        files.forEach((file) => {
          if (file.indexOf('README.md') < 0) {
            Fs.rmSync(Path.resolve(outputFolder, file));
          }
        });
      }
      const collectReferences = flags.references as boolean;

      const { pluginApiMap, missingApiItems, unreferencedDeprecations, referencedDeprecations } =
        getPluginApiMap(project, plugins, log, {
          collectReferences,
          pluginFilter: pluginFilter as string[],
        });

      const reporter = CiStatsReporter.fromEnv(log);

      const allPluginStats: { [key: string]: PluginMetaInfo & ApiStats & EslintDisableCounts } = {};
      for (const plugin of plugins) {
        const id = plugin.manifest.id;
        const pluginApi = pluginApiMap[id];

        allPluginStats[id] = {
          ...(await countEslintDisableLine(plugin.directory)),
          ...collectApiStatsForPlugin(pluginApi, missingApiItems, referencedDeprecations),
          owner: plugin.manifest.owner,
          description: plugin.manifest.description,
          isPlugin: plugin.isPlugin,
        };
      }

      writePluginDirectoryDoc(outputFolder, pluginApiMap, allPluginStats, log);

      plugins.forEach((plugin) => {
        // Note that the filtering is done here, and not above because the entire public plugin API has to
        // be parsed in order to correctly determine reference links, and ensure that `removeBrokenLinks`
        // doesn't remove more links than necessary.
        if (pluginFilter && !pluginFilter.includes(plugin.manifest.id)) {
          return;
        }

        const id = plugin.manifest.id;
        const pluginApi = pluginApiMap[id];
        const pluginStats = allPluginStats[id];
        const pluginTeam = plugin.manifest.owner.name;

        reporter.metrics([
          {
            id,
            meta: { pluginTeam },
            group: 'Unreferenced deprecated APIs',
            value: unreferencedDeprecations[id] ? unreferencedDeprecations[id].length : 0,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'API count',
            value: pluginStats.apiCount,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'API count missing comments',
            value: pluginStats.missingComments.length,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'API count with any type',
            value: pluginStats.isAnyType.length,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'Non-exported public API item count',
            value: missingApiItems[id] ? Object.keys(missingApiItems[id]).length : 0,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'References to deprecated APIs',
            value: pluginStats.deprecatedAPIsReferencedCount,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'ESLint disabled line counts',
            value: pluginStats.eslintDisableLineCount,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'ESLint disabled in files',
            value: pluginStats.eslintDisableFileCount,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'Total ESLint disabled count',
            value: pluginStats.eslintDisableFileCount + pluginStats.eslintDisableLineCount,
          },
        ]);

        const getLink = (d: ApiDeclaration) =>
          `https://github.com/elastic/kibana/tree/master/${d.path}#:~:text=${encodeURIComponent(
            d.label
          )}`;

        if (collectReferences && pluginFilter === plugin.manifest.id) {
          if (referencedDeprecations[id] && pluginStats.deprecatedAPIsReferencedCount > 0) {
            log.info(`${referencedDeprecations[id].length} deprecated APIs used`);
            // eslint-disable-next-line no-console
            console.table(referencedDeprecations[id]);
          } else {
            log.info(`No referenced deprecations for plugin ${plugin.manifest.id}`);
          }
          if (pluginStats.noReferences.length > 0) {
            // eslint-disable-next-line no-console
            console.table(
              pluginStats.noReferences.map((d) => ({
                id: d.id,
                link: getLink(d),
              }))
            );
          } else {
            log.info(`No unused APIs for plugin ${plugin.manifest.id}`);
          }
        }

        if (stats) {
          const passesAllChecks =
            pluginStats.isAnyType.length === 0 &&
            pluginStats.missingComments.length === 0 &&
            pluginStats.deprecatedAPIsReferencedCount === 0 &&
            (!missingApiItems[id] || Object.keys(missingApiItems[id]).length === 0);

          log.info(`--- Plugin '${id}' ${passesAllChecks ? ` passes all checks ----` : '----`'}`);

          if (!passesAllChecks) {
            log.info(`${pluginStats.isAnyType.length} API items with ANY`);

            if (stats.includes('any')) {
              // eslint-disable-next-line no-console
              console.table(
                pluginStats.isAnyType.map((d) => ({
                  id: d.id,
                  link: getLink(d),
                }))
              );
            }

            log.info(`${pluginStats.missingComments.length} API items missing comments`);
            if (stats.includes('comments')) {
              // eslint-disable-next-line no-console
              console.table(
                pluginStats.missingComments.map((d) => ({
                  id: d.id,
                  link: getLink(d),
                }))
              );
            }

            if (missingApiItems[id]) {
              log.info(
                `${Object.keys(missingApiItems[id]).length} referenced API items not exported`
              );
              if (stats.includes('exports')) {
                // eslint-disable-next-line no-console
                console.table(
                  Object.keys(missingApiItems[id]).map((key) => ({
                    'Not exported source': key,
                    references: missingApiItems[id][key].join(', '),
                  }))
                );
              }
            }
          }
        }

        if (pluginStats.apiCount > 0) {
          log.info(`Writing public API doc for plugin ${pluginApi.id}.`);
          writePluginDocs(outputFolder, { doc: pluginApi, plugin, pluginStats, log });
        } else {
          log.info(`Plugin ${pluginApi.id} has no public API.`);
        }
        writeDeprecationDocByPlugin(outputFolder, referencedDeprecations, log);
        writeDeprecationDueByTeam(outputFolder, referencedDeprecations, plugins, log);
        writeDeprecationDocByApi(
          outputFolder,
          referencedDeprecations,
          unreferencedDeprecations,
          log
        );
      });
      if (Object.values(pathsOutsideScopes).length > 0) {
        log.warning(`Found paths outside of normal scope folders:`);
        log.warning(pathsOutsideScopes);
      }
    },
    {
      log: {
        defaultLevel: 'info',
      },
      flags: {
        string: ['plugin', 'stats'],
        boolean: ['references'],
        help: `
          --plugin             Optionally, run for only a specific plugin
          --stats              Optionally print API stats. Must be one or more of: any, comments or exports.
          --references         Collect references for API items
        `,
      },
    }
  );
}

function getTsProject(repoPath: string) {
  const xpackTsConfig = `${repoPath}/tsconfig.json`;
  const project = new Project({
    tsConfigFilePath: xpackTsConfig,
    // We'll use the files added below instead.
    skipAddingFilesFromTsConfig: true,
  });
  project.addSourceFilesAtPaths([`${repoPath}/x-pack/plugins/**/*.ts`, '!**/*.d.ts']);
  project.addSourceFilesAtPaths([`${repoPath}/src/plugins/**/*.ts`, '!**/*.d.ts']);
  project.addSourceFilesAtPaths([`${repoPath}/packages/**/*.ts`, '!**/*.d.ts']);
  project.resolveSourceFileDependencies();
  return project;
}
