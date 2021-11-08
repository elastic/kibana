/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Path from 'path';
import { REPO_ROOT, ToolingLog } from '@kbn/dev-utils';
import { ApiDeclaration, PluginApi, PluginMetaInfo, PluginOrPackage, TypeKind } from '../types';
import {
  WeightedDependencyMap,
  DependencyEdge,
  DependencyMap,
  getDiGraphTextWithSubClusters,
  GroupedNodes,
} from './generate_weighted_dot_file';
import { getWeightedColor, getNodeProperties, getRelativeSizeOfNode } from './styles';
import { getSafeName } from './utils';
import { GVNode } from './types';
import { generateTeamGraphs } from './generate_team_graphs';
import { isTypeKindATSType } from '../utils';

interface PluginStatsMap {
  [key: string]: PluginMetaInfo;
}

export function writeDependencyGraph(
  plugins: PluginOrPackage[],
  pluginStats: PluginStatsMap,
  log: ToolingLog,
  onlyTrackThesePlugins?: PluginApi[]
) {
  log.info(`writeDependencyGraph`);
  const pluginTeamSubClusters: { [key: string]: PluginOrPackage[] } = groupPluginsByTeam(plugins);
  const transitiveDependencies = getTransitiveDependencyListMap(plugins, log);

  log.info('Building team dependency map with weights');

  const teamDependencyMap: WeightedDependencyMap = getTeamDependencies(
    pluginTeamSubClusters,
    transitiveDependencies,
    plugins
  );

  if (!onlyTrackThesePlugins) {
    generateTeamGraphs(plugins, pluginStats, teamDependencyMap);
  }

  writePluginDotFile(
    plugins,
    transitiveDependencies,
    teamDependencyMap,
    pluginStats,
    log,
    onlyTrackThesePlugins ? onlyTrackThesePlugins.map((p) => p.id) : undefined
  );

  if (onlyTrackThesePlugins) {
    onlyTrackThesePlugins.forEach((p) => {
      log.info('Building plugin reference graph');
      writeInnerPluginDotFile(p, plugins, log, transitiveDependencies);
    });
  }
}

export function getPluginsOwnedByTeam(plugins: PluginOrPackage[]): { [key: string]: string[] } {
  const pluginsOwnedByTeam: { [key: string]: string[] } = {};
  plugins.forEach((plugin) => {
    const teamOwner = plugin.manifest.owner.name;
    if (pluginsOwnedByTeam[teamOwner] === undefined) {
      pluginsOwnedByTeam[teamOwner] = [];
    }
    pluginsOwnedByTeam[teamOwner].push(plugin.manifest.id);
  });
  return pluginsOwnedByTeam;
}

function writeInnerPluginDotFile(
  pluginApi: PluginApi,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  transitiveDependencies: { [key: string]: string[] }
) {
  const plugin = plugins.find((p) => p.manifest.id === pluginApi.id);

  if (!plugin) {
    log.warning(`No plugin with name ${pluginApi.id} found`);
    return;
  }

  const edges: DependencyEdge[] = [];
  const apiNodes: GVNode[] = [];
  const pluginNodes: GVNode[] = [];

  const avgPublicWeight = getPluginEdgesAndNodes(
    pluginApi.client,
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies
  );
  const avgServerWeight = getPluginEdgesAndNodes(
    pluginApi.server,
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies
  );
  const avgCommonWeight = getPluginEdgesAndNodes(
    pluginApi.common,
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies
  );

  const avgApiWeight = (avgCommonWeight + avgPublicWeight + avgServerWeight) / 3;

  const color = getWeightedColor(avgApiWeight, 4);
  log.warning(`Avg api weight for ${pluginApi.id} is ${avgApiWeight}`);
  const text = getDiGraphTextWithSubClusters(edges, { [`${pluginApi.id}`]: apiNodes }, color);

  fs.writeFileSync(
    Path.resolve(REPO_ROOT, '..', 'ArchArt', `${getSafeName(pluginApi.id)}PluginDependencies.dot`),
    text
  );
}

function getPluginEdgesAndNodes(
  apis: ApiDeclaration[],
  edges: DependencyEdge[],
  apiNodes: GVNode[],
  pluginNodes: GVNode[],
  transitiveDependencies: { [key: string]: string[] }
) {
  let totalApiRefCount = 0;
  apis.forEach((api) => {
    if (api.lifecycle === undefined) {
      const nodeName = api.id;
      let color = getWeightedColor(api.references ? api.references.length : 0, 10);

      if (api.references && api.references.length > 0) {
        api.references.forEach((ref) => {
          edges.push({ dest: nodeName, source: ref.plugin });
          if (!pluginNodes.find((p) => p.name === ref.plugin)) {
            pluginNodes.push({ name: ref.plugin });
          }
        });
        totalApiRefCount += api.references.length;
      } else {
        color = 'yellow';
      }

      // Hide unreferenced types - those sometimes have to be exported even if they are unused and it makes the unreferened nodes
      // less actionable.
      if ((!api.references || api.references.length === 0) && isTypeKindATSType(api.type)) {
        return;
      }

      const properties = getNodeProperties(nodeName, color);
      apiNodes.push({ name: nodeName, properties });
    }

    if (
      api.children &&
      (api.type === TypeKind.InterfaceKind ||
        api.type === TypeKind.ClassKind ||
        api.type === TypeKind.ObjectKind)
    ) {
      getPluginEdgesAndNodes(api.children!, edges, apiNodes, pluginNodes, transitiveDependencies);
    }
  });

  return totalApiRefCount / apis.length;
}

function writePluginDotFile(
  plugins: PluginOrPackage[],
  transitiveDependencies: DependencyMap,
  teamDependencies: WeightedDependencyMap,
  pluginStats: PluginStatsMap,
  log: ToolingLog,
  pluginFilters?: string[]
) {
  const pluginInwardDependencyCount: { [key: string]: number } =
    getHowManyPluginsDependOnMe(plugins);

  const pluginsGroupedByTeam: { [key: string]: PluginOrPackage[] } = groupPluginsByTeam(plugins);
  const edges = getDirectPluginDependencies(plugins, pluginFilters);
  const nodes = getPluginNodes(
    pluginsGroupedByTeam,
    transitiveDependencies,
    teamDependencies,
    pluginInwardDependencyCount,
    pluginStats
  );

  const text = getDiGraphTextWithSubClusters(edges, nodes);
  const fileName = pluginFilters
    ? `filtered${pluginFilters.join('')}PluginDependencies.dot`
    : 'allPluginDependencies.dot';
  fs.writeFileSync(Path.resolve(REPO_ROOT, '..', 'ArchArt', fileName), text);
}

function getDirectPluginDependencies(
  plugins: PluginOrPackage[],
  pluginFilters?: string[]
): DependencyEdge[] {
  const dependencyList: DependencyEdge[] = [];
  plugins.forEach((plugin) => {
    const name = plugin.manifest.id;
    const dependencies = getDependenciesList(plugin);
    dependencies.forEach((dep) => {
      const pluginDependency = getPluginWithName(dep, plugins);
      if (
        !pluginFilters ||
        pluginFilters?.find((p) => p === plugin.manifest.id) ||
        (pluginDependency && pluginFilters?.find((p) => p === pluginDependency.manifest.id))
      ) {
        dependencyList.push({ source: name, dest: dep });
      }
    });
  });
  return dependencyList;
}

function getPluginNodes(
  pluginsGroupedByTeam: { [key: string]: PluginOrPackage[] },
  transitiveDependencies: DependencyMap,
  teamDependencyMap: WeightedDependencyMap,
  howManyPluginsDependendOnMeMap: { [key: string]: number },
  pluginStats: PluginStatsMap,
  teamFilter?: string
): GroupedNodes {
  const groupedNodes: GroupedNodes = {};

  const getMaxPublicApiSize = getMaxPubliAPISize(pluginStats);

  Object.keys(pluginsGroupedByTeam).forEach((team) => {
    const pluginsOwnedByTeam = pluginsGroupedByTeam[team];
    pluginsOwnedByTeam.forEach((plugin) => {
      if (!plugin.isPlugin) return;

      if (
        teamFilter &&
        team !== teamFilter &&
        !teamDependsOnTeam(plugin.manifest.owner.name, teamFilter, teamDependencyMap)
      ) {
        return;
      }

      const pluginName = plugin.manifest.id;
      const dependenyList = transitiveDependencies[plugin.manifest.id];
      const transitiveDependencyCount = dependenyList ? dependenyList.length : 0;

      if (groupedNodes[team] === undefined) {
        groupedNodes[team] = [];
      }

      const maxIncomingPluginDependencies = Object.values(howManyPluginsDependendOnMeMap).reduce(
        (max, current) => {
          return current > max ? current : max;
        },
        0
      );

      const properties = getPluginProperties(
        pluginName,
        howManyPluginsDependendOnMeMap[plugin.manifest.id]
          ? howManyPluginsDependendOnMeMap[plugin.manifest.id]
          : 0,
        maxIncomingPluginDependencies,
        pluginStats[plugin.manifest.id],
        getMaxPublicApiSize,
        transitiveDependencyCount
      );
      (groupedNodes[team] as GVNode[]).push({ name: pluginName, properties });
    });
  });
  return groupedNodes;
}

function getPluginWithName(name: string, plugins: PluginOrPackage[]): PluginOrPackage | undefined {
  return plugins.find((p) => p.manifest.id === name);
}

/**
 * Returns true if teamA depends on TeamB
 * @param teamA
 * @param teamB
 * @param teamDependencyMap
 * @returns
 */
function teamDependsOnTeam(
  teamA: string,
  teamB: string,
  teamDependencyMap: WeightedDependencyMap
): boolean {
  if (teamDependencyMap[teamA] === undefined) return false;

  return !!Object.keys(teamDependencyMap[teamA]).find((teamDependency) => teamDependency === teamB);
}

function getTeamDependencies(
  pluginTeamCluster: { [key: string]: PluginOrPackage[] },
  transitivePluginDependencies: { [key: string]: string[] },
  plugins: PluginOrPackage[]
): WeightedDependencyMap {
  const teamDependencyMap: WeightedDependencyMap = {};
  Object.keys(pluginTeamCluster).forEach((team) => {
    const teamOwnedPlugins = pluginTeamCluster[team];

    teamOwnedPlugins.forEach((teamOwnedPlugin) => {
      if (teamDependencyMap[team] === undefined) {
        teamDependencyMap[team] = {};
      }
      const dependingOnTeamsWithWeight: { [key: string]: number } = teamDependencyMap[team];
      const pluginDependencies = transitivePluginDependencies[teamOwnedPlugin.manifest.id];

      pluginDependencies.forEach((pluginDependencyName) => {
        const pluginDependncy = plugins.find((p) => p.manifest.id === pluginDependencyName);
        if (!pluginDependncy) return;

        const teamDependency = pluginDependncy?.manifest.owner.name;
        if (dependingOnTeamsWithWeight[teamDependency] === undefined) {
          dependingOnTeamsWithWeight[teamDependency] = 0;
        }
        dependingOnTeamsWithWeight[teamDependency]++;
      });
    });
  });
  return teamDependencyMap;
}

function getTransitiveDependencyListMap(
  plugins: PluginOrPackage[],
  log: ToolingLog
): { [key: string]: string[] } {
  const dependencyListMap: { [key: string]: string[] } = {};
  log.info('Getting dependency list map');

  plugins.forEach((plugin) => {
    dependencyListMap[plugin.manifest.id] = [];
    addTransitiveDependenciesForPlugin(
      plugin.manifest.id,
      plugins,
      dependencyListMap[plugin.manifest.id],
      log
    );
  });

  return dependencyListMap;
}

function addTransitiveDependenciesForPlugin(
  pluginName: string,
  plugins: PluginOrPackage[],
  dependencies: string[],
  log: ToolingLog
): string[] {
  const plugin = plugins.find((p) => p.manifest.id === pluginName);
  if (!plugin) return [];

  const directDependencies = getDependenciesList(plugin);

  // For each direct dependency, add _that_ plugin's dependencies
  directDependencies.forEach((d) => {
    if (dependencies.find((dep) => d === dep)) {
      // log.warning(d + ' already in list of dependencies for plugin ' + plugin.manifest.id);
    } else {
      dependencies.push(d);
      addTransitiveDependenciesForPlugin(d, plugins, dependencies, log);
    }
  });

  return dependencies;
}

function getMaxPubliAPISize(pluginStats: { [key: string]: PluginMetaInfo }) {
  return Object.values(pluginStats).reduce((maxSize, plugin) => {
    if (plugin.apiCount > maxSize) return plugin.apiCount;
    return maxSize;
  }, 0);
}

function groupPluginsByTeam(plugins: PluginOrPackage[]): {
  [key: string]: PluginOrPackage[];
} {
  const teamGroups: {
    [key: string]: PluginOrPackage[];
  } = {};

  plugins.forEach((plugin) => {
    if (!plugin.isPlugin) return;

    if (teamGroups[plugin.manifest.owner.name] === undefined) {
      teamGroups[plugin.manifest.owner.name] = [];
    }
    teamGroups[plugin.manifest.owner.name].push(plugin);
  });

  return teamGroups;
}

function getDependenciesList(plugin: PluginOrPackage): string[] {
  return [
    ...(plugin.manifest.requiredBundles || []),
    ...(plugin.manifest.optionalPlugins || []),
    ...(plugin.manifest.requiredPlugins || []),
  ];
}

function getHowManyPluginsDependOnMe(plugins: PluginOrPackage[]): { [key: string]: number } {
  const howManyPluginsDependendOnMe: { [key: string]: number } = {};
  plugins.forEach((plugin) => {
    const dependencies = getDependenciesList(plugin);
    dependencies.forEach((dep) => {
      if (howManyPluginsDependendOnMe[dep] === undefined) {
        howManyPluginsDependendOnMe[dep] = 0;
      }
      howManyPluginsDependendOnMe[dep] += 1;
    });
  });
  return howManyPluginsDependendOnMe;
}

function getPluginProperties(
  pluginId: string,
  howManyPluginsDependendOnMe: number,
  maxIncomingDependencyCount: number,
  pluginStats: PluginMetaInfo,
  maxPublicApiSize: number,
  howManyModulesIDependOn: number
): string {
  const size = getRelativeSizeOfNode(pluginStats.apiCount, maxPublicApiSize);
  const color = getWeightedColor(howManyPluginsDependendOnMe, maxIncomingDependencyCount);
  const Ce = howManyModulesIDependOn;
  const Ca = howManyPluginsDependendOnMe;

  const instability = Math.round((Ce / (Ce + Ca)) * 100) / 100;

  return getNodeProperties(`${pluginId}\\nI: ${instability}\\nCe: ${Ce} | Ca: ${Ca}"`, color, size);
}
