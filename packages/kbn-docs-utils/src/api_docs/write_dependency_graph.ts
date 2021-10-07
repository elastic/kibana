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
import { ApiDeclaration, PluginApi, PluginMetaInfo, PluginOrPackage, TypeKind } from './types';

// Each team has an entry in the map that is a mapping of teams it depends on and the number of times it
// depends on a plugin ownedd by that team. For example, if TeamA owns PluginA1 and PluginA2 and TeamB
// owns PluginB1 and PluginB2, and PluginA1 -> PluginB2  and pluginA1 -> PluginB1, the map will be:
// {
//   TeamA: {
//     TeamB: 2
//   }
// }
//
interface TeamDependencyMap {
  [key: string]: { [key: string]: number };
}

interface Node {
  name: string;
  properties?: string;
}

interface GroupedNodes {
  [key: string]: Node[];
}

interface DependencyMap {
  [key: string]: string[];
}

interface DependencyEdge {
  source: string;
  dest: string;
  properties?: string;
}

interface PluginStatsMap {
  [key: string]: PluginMetaInfo;
}

export function writeDependencyGraph(
  outputFolder: string,
  plugins: PluginOrPackage[],
  pluginStats: PluginStatsMap,
  log: ToolingLog,
  onlyTrackThisPlugin?: PluginApi
) {
  log.info(`writeDependencyGraph, onlyTrackThisPlugin is ` + onlyTrackThisPlugin);
  const pluginTeamSubClusters: { [key: string]: PluginOrPackage[] } = groupPluginsByTeam(plugins);
  const transitiveDependencies = getTransitiveDependencyListMap(plugins, log);

  log.info('Building team dependency map with weights');
  const teamDependencyMap: TeamDependencyMap = getTeamDependencies(
    pluginTeamSubClusters,
    transitiveDependencies,
    plugins
  );

  writeTeamDependencyDotFile(teamDependencyMap);

  // const FILTER_ON_TEAM = onlyTrackThisPlugin ? onlyTrackThisPlugin.id : undefined;
  writePluginDotFile(
    plugins,
    transitiveDependencies,
    teamDependencyMap,
    pluginStats,
    log
    // FILTER_ON_TEAM
  );

  if (onlyTrackThisPlugin) {
    log.info('Building plugin reference graph');
    const FROM_PLUGIN = 'lens';
    writeInnerPluginDotFile(onlyTrackThisPlugin, plugins, log, transitiveDependencies, FROM_PLUGIN);
  }
}

function writeInnerPluginDotFile(
  pluginApi: PluginApi,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  transitiveDependencies: { [key: string]: string[] },
  fromPlugin: string
) {
  const plugin = plugins.find((p) => p.manifest.id === pluginApi.id);

  if (!plugin) {
    log.warning(`No plugin with name ${pluginApi.id} found`);
    return;
  }

  const edges: DependencyEdge[] = [];
  const apiNodes: Node[] = [];
  const pluginNodes: Node[] = [];

  getPluginEdgesAndNodes(
    pluginApi.client,
    'client',
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies,
    fromPlugin
  );
  getPluginEdgesAndNodes(
    pluginApi.server,
    'server',
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies,
    fromPlugin
  );
  getPluginEdgesAndNodes(
    pluginApi.common,
    'common',
    edges,
    apiNodes,
    pluginNodes,
    transitiveDependencies,
    fromPlugin
  );

  const text = getDiGraphTextWithSubClusters(edges, { [`${pluginApi.id}`]: apiNodes });

  fs.writeFileSync(
    Path.resolve(REPO_ROOT, `plugin${getSafeName(pluginApi.id)}Dependencies.dot`),
    text
  );
}

function getPluginEdgesAndNodes(
  apis: ApiDeclaration[],
  scope: string,
  edges: DependencyEdge[],
  apiNodes: Node[],
  pluginNodes: Node[],
  transitiveDependencies: { [key: string]: string[] },
  fromPlugin: string
) {
  apis.forEach((api) => {
    if (api.lifecycle === undefined) {
      const nodeName = `${scope}${api.id}`;
      apiNodes.push({ name: nodeName });

      if (api.references) {
        api.references.forEach((ref) => {
          edges.push({ dest: nodeName, source: ref.plugin });
          if (!pluginNodes.find((p) => p.name === ref.plugin)) {
            pluginNodes.push({ name: ref.plugin });
          }
        });

        apiNodes.push({ name: nodeName });
      } else {
        apiNodes.push({ name: nodeName, properties: 'style=filled,color=yellow' });
      }
    }

    if (
      api.children &&
      (api.type === TypeKind.InterfaceKind ||
        api.type === TypeKind.ClassKind ||
        api.type === TypeKind.ObjectKind)
    ) {
      getPluginEdgesAndNodes(
        api.children!,
        scope,
        edges,
        apiNodes,
        pluginNodes,
        transitiveDependencies,
        fromPlugin
      );
    }
  });
}

function writeTeamDependencyDotFile(allTeamDependencies: TeamDependencyMap) {
  const edges = getTeamEdges(allTeamDependencies);
  const text = getDiGraphText(edges, []);

  fs.writeFileSync(Path.resolve(REPO_ROOT, '..', 'ArchArt', 'teamDependencies.dot'), text);
}

function getTeamEdges(allTeamDependencies: TeamDependencyMap): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  Object.keys(allTeamDependencies).forEach((team) => {
    const oneTeamDependencies = allTeamDependencies[team];
    Object.keys(oneTeamDependencies).forEach((teamDependency) => {
      // An interesting cohesion metric, but don't connect nodes to themselves.
      if (team === teamDependency) return;

      //  const properties = `penwidth=${Math.min(oneTeamDependencies[teamDependency], 10)}`;
      edges.push({ source: team, dest: teamDependency });
    });
  });
  return edges;
}

function writePluginDotFile(
  plugins: PluginOrPackage[],
  transitiveDependencies: DependencyMap,
  teamDependencies: TeamDependencyMap,
  pluginStats: PluginStatsMap,
  log: ToolingLog,
  teamFilter?: string
) {
  const pluginDependencyCount: { [key: string]: number } = getHowManyPluginsDependOnMe(plugins);

  const pluginsGroupedByTeam: { [key: string]: PluginOrPackage[] } = groupPluginsByTeam(plugins);
  const edges = getDirectPluginDependencies(plugins, teamFilter);
  const nodes = getPluginNodes(
    pluginsGroupedByTeam,
    transitiveDependencies,
    teamDependencies,
    pluginDependencyCount,
    pluginStats
  );

  const text = getDiGraphTextWithSubClusters(edges, nodes);
  const fileName = teamFilter ? `${teamFilter}PluginDependencies.dot` : 'allPluginDependencies.dot';
  fs.writeFileSync(Path.resolve(REPO_ROOT, fileName), text);
}

function getDirectPluginDependencies(
  plugins: PluginOrPackage[],
  teamFilter?: string
): DependencyEdge[] {
  const dependencyList: DependencyEdge[] = [];
  plugins.forEach((plugin) => {
    const name = plugin.manifest.id;
    const dependencies = getDependenciesList(plugin);
    dependencies.forEach((dep) => {
      const pluginDependency = getPluginWithName(dep, plugins);
      if (
        !teamFilter ||
        plugin.manifest.owner.name === teamFilter ||
        (pluginDependency && pluginDependency.manifest.owner.name === teamFilter)
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
  teamDependencyMap: TeamDependencyMap,
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

      const properties = getPluginProperties(
        pluginName,
        howManyPluginsDependendOnMeMap[plugin.manifest.id]
          ? howManyPluginsDependendOnMeMap[plugin.manifest.id]
          : 0,
        pluginStats[plugin.manifest.id],
        getMaxPublicApiSize,
        transitiveDependencyCount
      );
      groupedNodes[team].push({ name: pluginName, properties });
    });
  });
  return groupedNodes;
}

function getDiGraphTextWithSubClusters(
  dependencies: Array<{ source: string; dest: string }>,
  groupedNodes: { [key: string]: Node[] }
) {
  return `digraph test{
    ${getNodesSubGraphText(groupedNodes)}
     ${getDependenciesText(dependencies)}
  }`;
}

function getDiGraphText(dependencies: Array<{ source: string; dest: string }>, nodes: Node[]) {
  return `digraph test{
  ${getNodesText(nodes)}
   ${getDependenciesText(dependencies)}
}`;
}

function getDependenciesText(
  dependencies: Array<{ source: string; dest: string; properties?: string }>
) {
  let text = '';
  dependencies.forEach(({ source, dest, properties }) => {
    text += `${getSafeName(source)} -> ${getSafeName(dest)} ${
      properties ? `[${properties}]` : ''
    }\n`;
  });
  return text;
}

function getNodesSubGraphText(groupedNodes: { [key: string]: Node[] }) {
  let text = '';
  Object.keys(groupedNodes).forEach((groupName) => {
    const nodes = groupedNodes[groupName];
    text += `subgraph cluster${getSafeName(groupName)} {
      label="${groupName}"
      style=filled
      `;
    text += getNodesText(nodes);
    text += `}\n`;
  });
  return text;
}

function getNodesText(nodes: Node[]): string {
  let text = '';
  nodes.forEach(({ name, properties }) => {
    text += `${getSafeName(name)} ${properties ? `[${properties}]` : ''}\n`;
  });
  return text;
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
  teamDependencyMap: TeamDependencyMap
): boolean {
  if (teamDependencyMap[teamA] === undefined) return false;

  return !!Object.keys(teamDependencyMap[teamA]).find((teamDependency) => teamDependency === teamB);
}

function getTeamDependencies(
  pluginTeamCluster: { [key: string]: PluginOrPackage[] },
  transitivePluginDependencies: { [key: string]: string[] },
  plugins: PluginOrPackage[]
): TeamDependencyMap {
  const teamDependencyMap: TeamDependencyMap = {};
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

// function getPluginDependencyCountMap(plugins: PluginOrPackage[]): { [key: string]: number } {
//   const pluginDependencyCounts: { [key: string]: number } = {};
//   plugins.forEach((plugin) => {
//     const dependencies = getDependenciesList(plugin);
//     pluginDependencyCounts[plugin.manifest.id] = dependencies.length;
//   });

//   return pluginDependencyCounts;
// }

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
  pluginStats: PluginMetaInfo,
  maxPublicApiSize: number,
  howManyModulesIDependOn: number
): string {
  const size = getSizeOfPlugin(pluginStats.apiCount, maxPublicApiSize);
  const color = getColorForPlugin(howManyModulesIDependOn);
  const Ce = howManyModulesIDependOn;
  const Ca = howManyPluginsDependendOnMe;

  const instability = Math.round((Ce / (Ce + Ca)) * 100) / 100;

  return `label="${getSafeName(
    pluginId
  )}\\nI: ${instability}\\nCe: ${Ce} | Ca: ${Ca}" fillcolor="${color}", style=filled fixedsize=true width=${size} height=${size}`;
}

function getSafeName(name: string): string {
  return name === 'graph' ? 'graph1' : name.replaceAll(/[ -.@]/gi, '');
}

// function getInstabilityColorForPlugin(instability: number): string {
//   const colors = [
//     '#FFFFFF', // 0
//     '#F6DDCC', // .1 Light orange
//     '#F5CBA7', // .2  Med orange
//     '#F5B7B1', // .4
//     '#EC7063', // .8
//     '#E74C3C', // .9
//     '#B03A2E', // 1
//   ];
//   const thresholds = [0, 0.1, 0.2, 0.4, 0.8, 0.9, 1];
//   const color = '#943126'; // dark red

//   if (isNaN(instability) || instability === undefined || instability === 0) {
//     return '#A3E4D7'; // light green
//   }

//   for (let i = 0; i < thresholds.length; i++) {
//     if (instability <= thresholds[i]) {
//       return colors[i];
//     }
//   }

//   console.log('Instability is ' + instability);
//   return color;
// }

function getColorForPlugin(howManyPluginsDependendOnMe: number): string {
  const colors = [
    '#FFFFFF', // 0
    '#F6DDCC', // 1 Light orange
    '#F5CBA7', // 2  Med orange
    '#F5B7B1', // 4
    '#EC7063', // 8
    '#E74C3C', // 16
    '#B03A2E', // 32
    '#78281F', // 64
    '#641E16', // 128
  ];
  const thresholds = [0, 1, 2, 4, 8, 16, 32, 64, 128];
  let color = 'black';

  if (howManyPluginsDependendOnMe === undefined || howManyPluginsDependendOnMe === 0) {
    return '#A3E4D7'; // light green
  }

  for (let i = 0; i < thresholds.length; i++) {
    if (howManyPluginsDependendOnMe <= thresholds[i]) {
      color = colors[i];
      return color;
    }
  }
  return color;
}

function getSizeOfPlugin(publicAPISize: number, maxPublicApiSize: number): number {
  const MAX_SIZE = 10;

  const comparativeApiSizeRatio = publicAPISize / maxPublicApiSize;

  return Math.max(comparativeApiSizeRatio * MAX_SIZE, 1);
}
