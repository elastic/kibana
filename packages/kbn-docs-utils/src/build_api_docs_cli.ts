/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
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
import { countEslintDisableLines, EslintDisableCounts } from './count_eslint_disable';
import { writeDeprecationDueByTeam } from './mdx/write_deprecations_due_by_team';
import { trimDeletedDocsFromNav } from './trim_deleted_docs_from_nav';
import { getAllDocFileIds } from './mdx/get_all_doc_file_ids';
import { getPathsByPackage } from './get_paths_by_package';

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

export function runBuildApiDocsCli() {
  run(
    async ({ log, flags }) => {
      const collectReferences = flags.references as boolean;
      const stats = flags.stats && typeof flags.stats === 'string' ? [flags.stats] : flags.stats;
      const pluginFilter =
        flags.plugin && typeof flags.plugin === 'string'
          ? [flags.plugin]
          : (flags.plugin as string[] | undefined);

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

      const outputFolder = Path.resolve(REPO_ROOT, 'api_docs');

      const initialDocIds =
        !pluginFilter && Fs.existsSync(outputFolder)
          ? await getAllDocFileIds(outputFolder)
          : undefined;

      const project = getTsProject(REPO_ROOT);

      const plugins = findPlugins();

      // if the output folder already exists, and we don't have a plugin filter, delete all the files in the output folder
      if (Fs.existsSync(outputFolder) && !pluginFilter) {
        await Fsp.rm(outputFolder, { recursive: true });
      }

      // if the output folder doesn't exist, create it
      if (!Fs.existsSync(outputFolder)) {
        await Fsp.mkdir(outputFolder, { recursive: true });
      }

      const {
        pluginApiMap,
        missingApiItems,
        unreferencedDeprecations,
        referencedDeprecations,
        adoptionTrackedAPIs,
      } = getPluginApiMap(project, plugins, log, { collectReferences, pluginFilter });

      const reporter = CiStatsReporter.fromEnv(log);
      const pathsByPlugin = await getPathsByPackage(plugins);

      const allPluginStats: { [key: string]: PluginMetaInfo & ApiStats & EslintDisableCounts } = {};
      for (const plugin of plugins) {
        const id = plugin.manifest.id;
        const pluginApi = pluginApiMap[id];
        const paths = pathsByPlugin.get(plugin) ?? [];

        allPluginStats[id] = {
          ...(await countEslintDisableLines(paths)),
          ...collectApiStatsForPlugin(
            pluginApi,
            missingApiItems,
            referencedDeprecations,
            adoptionTrackedAPIs
          ),
          owner: plugin.manifest.owner,
          description: plugin.manifest.description,
          isPlugin: plugin.isPlugin,
        };
      }

      await writePluginDirectoryDoc(outputFolder, pluginApiMap, allPluginStats, log);

      for (const plugin of plugins) {
        // Note that the filtering is done here, and not above because the entire public plugin API has to
        // be parsed in order to correctly determine reference links, and ensure that `removeBrokenLinks`
        // doesn't remove more links than necessary.
        if (pluginFilter && !pluginFilter.includes(plugin.manifest.id)) {
          continue;
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
            meta: {
              pluginTeam,
              // `meta` only allows primitives or string[]
              // Also, each string is allowed to have a max length of 2056,
              // so it's safer to stringify each element in the array over sending the entire array as stringified.
              // My internal tests with 4 plugins using the same API gets to a length of 156 chars,
              // so we should have enough room for tracking popular APIs.
              // TODO: We can do a follow-up improvement to split the report if we find out we might hit the limit.
              adoptionTrackedAPIs: pluginStats.adoptionTrackedAPIs.map((metric) =>
                JSON.stringify(metric)
              ),
            },
            group: 'Adoption-tracked APIs',
            value: pluginStats.adoptionTrackedAPIsCount,
          },
          {
            id,
            meta: { pluginTeam },
            group: 'Adoption-tracked APIs that are not used anywhere',
            value: pluginStats.adoptionTrackedAPIsUnreferencedCount,
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
          `https://github.com/elastic/kibana/tree/main/${d.path}#:~:text=${encodeURIComponent(
            d.label
          )}`;

        if (collectReferences && pluginFilter?.includes(plugin.manifest.id)) {
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
          await writePluginDocs(outputFolder, { doc: pluginApi, plugin, pluginStats, log });
        } else {
          log.info(`Plugin ${pluginApi.id} has no public API.`);
        }
        await writeDeprecationDocByPlugin(outputFolder, referencedDeprecations, log);
        await writeDeprecationDueByTeam(outputFolder, referencedDeprecations, plugins, log);
        await writeDeprecationDocByApi(
          outputFolder,
          referencedDeprecations,
          unreferencedDeprecations,
          log
        );
      }

      if (Object.values(pathsOutsideScopes).length > 0) {
        log.warning(`Found paths outside of normal scope folders:`);
        log.warning(pathsOutsideScopes);
      }

      if (initialDocIds) {
        await trimDeletedDocsFromNav(log, initialDocIds, outputFolder);
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
  project.addSourceFilesAtPaths([`${repoPath}/x-pack/packages/**/*.ts`, '!**/*.d.ts']);
  project.addSourceFilesAtPaths([`${repoPath}/src/plugins/**/*.ts`, '!**/*.d.ts']);
  project.addSourceFilesAtPaths([`${repoPath}/packages/**/*.ts`, '!**/*.d.ts']);
  project.resolveSourceFileDependencies();
  return project;
}
