/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { attribute as _, digraph, toDot } from 'ts-graphviz';

import { ToolingLog } from '@kbn/tooling-log';

import { getAllPlugins } from './lib';

export const dotDependencies = (log: ToolingLog) => {
  const plugins = getAllPlugins(log);
  const pluginIds = plugins.map((plugin) => plugin.manifest.id);

  log.debug(`Generating graphviz dot for ${plugins.length} plugins.`);

  const G = digraph(
    'KibanaPlugins',
    {
      [_.overlap]: false,
      [_.splines]: true,
      [_.rankdir]: 'TB',
      [_.nodesep]: 0.05,
      [_.ranksep]: 0.05,
      [_.concentrate]: false,
      [_.ratio]: 0.6,
      [_.size]: '40,30',
      [_.pack]: true,
      [_.newrank]: true,
      [_.mode]: 'hier',
    },

    (g) => {
      g.node({
        [_.style]: 'rounded',
        // [_.fixedsize]: true,
        // [_.width]: 2,
        [_.shape]: 'box',
        [_.fontname]: 'Arial',
        // [_.label]: '',
        [_.fontsize]: 100,
      });

      g.edge({
        [_.weight]: 100,
        [_.arrowsize]: 0.5,
        [_.penwidth]: 2,
        [_.color]: 'steelblue',
      });

      // ranks

      g.subgraph('visTypes', { [_.rank]: 'same' }, (sg) => {
        sg.node('visTypeGauge');
        sg.node('visTypeHeatmap');
        sg.node('visTypeMarkdown');
        sg.node('visTypeMetric');
        sg.node('visTypePie');
        sg.node('visTypeTable');
        sg.node('visTypeTagcloud');
        sg.node('visTypeTimelion');
        sg.node('visTypeVega');
        sg.node('visTypeVislib');
        sg.node('visTypeXy');
        sg.node('inputControlVis');
        sg.node('imageEmbeddable');
        sg.node('canvas');
      });

      g.subgraph('serverless', { [_.rank]: 'same' }, (sg) => {
        sg.node('securitySolutionServerless');
        sg.node('serverlessObservability');
        sg.node('serverlessSearch');
      });

      g.subgraph('management', { [_.rank]: 'same' }, (sg) => {
        sg.node('transform');
        sg.node('watcher');
        sg.node('snapshotRestore');
        sg.node('rollup');
        sg.node('runtimeFields');
        sg.node('dataViewManagement');
        sg.node('indexLifecycleManagement');
        sg.node('crossClusterReplication');
      });

      g.subgraph('devtools', { [_.rank]: 'same' }, (sg) => {
        sg.node('painlessLab');
        sg.node('grokdebugger');
      });

      g.subgraph('telemetry', { [_.rank]: 'same' }, (sg) => {
        sg.node('telemetryCollectionXpack');
        sg.node('telemetryManagementSection');
        sg.node('kibanaUsageCollection');
      });

      g.subgraph('o11y', { [_.rank]: 'same' }, (sg) => {
        sg.node('observabilityAiAssistantManagement');
        sg.node('observabilityLogsExplorer');
        sg.node('observabilityOnboarding');
        sg.node('uptime');
        sg.node('synthetics');
        sg.node('infra');
      });

      g.subgraph('esql', { [_.rank]: 'same' }, (sg) => {
        sg.node('esql');
        sg.node('esqlDataGrid');
      });

      g.subgraph('globalSearch', { [_.rank]: 'same' }, (sg) => {
        sg.node('globalSearchBar');
        sg.node('globalSearchProviders');
      });

      g.subgraph('searchSolution', { [_.rank]: 'same' }, (sg) => {
        sg.node('searchAssistant');
        sg.node('searchHomepage');
        sg.node('searchNotebooks');
        sg.node('searchSynonyms');
        sg.node('enterpriseSearch');
      });

      g.subgraph('cloud', { [_.rank]: 'same' }, (sg) => {
        sg.node('cloudChat');
        sg.node('cloudDataMigration');
        sg.node('cloudExperiments');
        sg.node('cloudFullStory');
        sg.node('cloudLinks');
      });

      plugins.forEach((plugin) => {
        const dependencyCount =
          (plugin.manifest.optionalPlugins?.length ?? 0) +
          (plugin.manifest.requiredPlugins?.length ?? 0);

        const usageCount = plugins.reduce((acc, p) => {
          if (
            p.manifest.optionalPlugins
              ?.concat(p.manifest.requiredPlugins ?? [])
              .includes(plugin.manifest.id)
          ) {
            acc++;
          }
          if (p.manifest.requiredPlugins?.includes(plugin.manifest.id)) {
            acc++;
          }
          return acc;
        }, 0);

        if (usageCount === 0) {
          // console.log('leaf', plugin.manifest.id);
        }

        if (dependencyCount === 0 && usageCount === 0) {
          return;
        }

        plugin.manifest.optionalPlugins?.forEach((optional) => {
          if (!pluginIds.includes(optional)) {
            return;
            throw new Error(
              `Optional plugin ${optional} in ${plugin.manifest.id} is missing from list of plugins.`
            );
          }

          g.edge([optional, plugin.manifest.id], {
            [_.color]: 'lightsteelblue',
            [_.style]: 'dashed',
            [_.constraint]: false,
            [_.weight]: 10,
          });
        });

        plugin.manifest.requiredPlugins?.forEach((required) => {
          if (!pluginIds.includes(required)) {
            return;
            throw new Error(
              `Required plugin ${required} in ${plugin.manifest.id} is missing from list of plugins.`
            );
          }

          g.edge([required, plugin.manifest.id]);
        });

        // plugin.manifest.requiredBundles?.forEach((bundle) => {
        //   g.edge([plugin.manifest.id, bundle]);
        // });
      });
    }
  );

  log.info(toDot(G));

  // return sorted;
};
