/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT, run, CiStatsReporter, createFlagError } from '@kbn/dev-utils';
import { Project } from 'ts-morph';

import { writePluginDocs } from './mdx/write_plugin_mdx_docs';
import {
  ApiDeclaration,
  ApiStats,
  MissingApiItemMap,
  PluginApi,
  PluginMetaInfo,
  ReferencedDeprecationsByPlugin,
  TypeKind,
} from './types';
import { findPlugins } from './find_plugins';
import { pathsOutsideScopes } from './build_api_declarations/utils';
import { getPluginApiMap } from './get_plugin_api_map';
import { writeDeprecationDocByApi } from './mdx/write_deprecations_doc_by_api';
import { writeDeprecationDocByPlugin } from './mdx/write_deprecations_doc_by_plugin';
import { writePluginDirectoryDoc } from './mdx/write_plugin_directory_doc';

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

      const { pluginApiMap, missingApiItems, unReferencedDeprecations, referencedDeprecations } =
        getPluginApiMap(project, plugins, log, {
          collectReferences,
          pluginFilter: pluginFilter as string[],
        });

      const reporter = CiStatsReporter.fromEnv(log);

      const allPluginStats = plugins.reduce((acc, plugin) => {
        const id = plugin.manifest.id;
        const pluginApi = pluginApiMap[id];
        acc[id] = {
          ...collectApiStatsForPlugin(pluginApi, missingApiItems, referencedDeprecations),
          owner: plugin.manifest.owner,
          description: plugin.manifest.description,
          isPlugin: plugin.isPlugin,
        };
        return acc;
      }, {} as { [key: string]: PluginMetaInfo });

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

        reporter.metrics([
          {
            id,
            group: 'API count',
            value: pluginStats.apiCount,
          },
          {
            id,
            group: 'API count missing comments',
            value: pluginStats.missingComments.length,
          },
          {
            id,
            group: 'API count with any type',
            value: pluginStats.isAnyType.length,
          },
          {
            id,
            group: 'Non-exported public API item count',
            value: missingApiItems[id] ? Object.keys(missingApiItems[id]).length : 0,
          },
          {
            id,
            group: 'References to deprecated APIs',
            value: pluginStats.deprecatedAPIsReferencedCount,
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
        writeDeprecationDocByApi(
          outputFolder,
          referencedDeprecations,
          unReferencedDeprecations,
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
  });
  project.addSourceFilesAtPaths(`${repoPath}/x-pack/plugins/**/*{.d.ts,.ts}`);
  project.addSourceFilesAtPaths(`${repoPath}/src/plugins/**/*{.d.ts,.ts}`);
  project.addSourceFilesAtPaths(`${repoPath}/packages/**/*{.d.ts,.ts}`);
  project.resolveSourceFileDependencies();
  return project;
}

function collectApiStatsForPlugin(
  doc: PluginApi,
  missingApiItems: MissingApiItemMap,
  deprecations: ReferencedDeprecationsByPlugin
): ApiStats {
  const stats: ApiStats = {
    missingComments: [],
    isAnyType: [],
    noReferences: [],
    deprecatedAPIsReferencedCount: 0,
    apiCount: countApiForPlugin(doc),
    missingExports: Object.values(missingApiItems[doc.id] ?? {}).length,
  };
  Object.values(doc.client).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  Object.values(doc.server).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  Object.values(doc.common).forEach((def) => {
    collectStatsForApi(def, stats, doc);
  });
  stats.deprecatedAPIsReferencedCount = deprecations[doc.id] ? deprecations[doc.id].length : 0;
  return stats;
}

function collectStatsForApi(doc: ApiDeclaration, stats: ApiStats, pluginApi: PluginApi): void {
  const missingComment = doc.description === undefined || doc.description.length === 0;
  if (missingComment) {
    stats.missingComments.push(doc);
  }
  if (doc.type === TypeKind.AnyKind) {
    stats.isAnyType.push(doc);
  }
  if (doc.children) {
    doc.children.forEach((child) => {
      collectStatsForApi(child, stats, pluginApi);
    });
  }
  if (!doc.references || doc.references.length === 0) {
    stats.noReferences.push(doc);
  }
}

function countApiForPlugin(doc: PluginApi) {
  return (
    doc.client.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    doc.server.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0) +
    doc.common.reduce((sum, def) => {
      return sum + countApi(def);
    }, 0)
  );
}

function countApi(doc: ApiDeclaration): number {
  if (!doc.children) return 1;
  else
    return (
      1 +
      doc.children.reduce((sum, child) => {
        return sum + countApi(child);
      }, 0)
    );
}
