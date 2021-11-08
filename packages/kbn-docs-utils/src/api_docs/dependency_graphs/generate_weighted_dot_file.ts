/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { REPO_ROOT } from '@kbn/utils';
import fs from 'fs';
import Path from 'path';
import {
  CURR_COLOR_SCHEME,
  getFontColor,
  getNodeProperties,
  getRelativeSizeOfNode,
  getWeightedColor,
} from './styles';
import { GVNode } from './types';
import { getSafeName } from './utils';

// Each team has an entry in the map that is a mapping of teams it depends on and the number of times it
// depends on a plugin ownedd by that team. For example, if TeamA owns PluginA1 and PluginA2 and TeamB
// owns PluginB1 and PluginB2, and PluginA1 -> PluginB2  and pluginA1 -> PluginB1, the map will be:
// {
//   TeamA: {
//     TeamB: 2
//   }
// }
//
export interface WeightedDependencyMap {
  [key: string]: { [key: string]: number };
}

export interface GroupedNodes {
  [key: string]: GVNode[] | GroupedNodes;
}
export interface DependencyMap {
  [key: string]: string[];
}

export interface DependencyEdge {
  source: string;
  dest: string;
  properties?: string;
}

export function generatWeightedDotFile(
  dependencies: WeightedDependencyMap,
  groupToSubGroup: { [key: string]: string[] },
  subGroupSizes: { [key: string]: number }
) {
  const groupApiSize = getApiSizeByHigherGroup(subGroupSizes, groupToSubGroup);
  const groupDependencyMap = getGroupDependencies(dependencies, groupToSubGroup);
  const groupSizes = getGroupedSizeMap(groupToSubGroup, subGroupSizes);

  writeWeightedDependencyDotFile(groupDependencyMap, groupSizes, 'groupColorApiSize', groupApiSize);
  writeWeightedDependencyDotFile(groupDependencyMap, groupSizes, 'groupColorDep');
}

export function writeWeightedDependencyDotFile(
  dependencies: WeightedDependencyMap,
  sizeMap: { [key: string]: number },
  fileName: string,
  colorWithWeights?: { [key: string]: number }
) {
  const nodes = getWeightedSizedNodes(dependencies, sizeMap, colorWithWeights);
  const edges = getDependencyEdges(dependencies);
  const text = getDiGraphText(edges, nodes);

  fs.writeFileSync(Path.resolve(REPO_ROOT, '..', 'ArchArt', `${fileName}.dot`), text);
}

export function getEdgeMaxDependencyWeight(dependencies: WeightedDependencyMap): number {
  return Object.keys(dependencies).reduce((max, source) => {
    const sourceDependencies = dependencies[source];
    const sourceMax = Object.keys(sourceDependencies).reduce((sMax, dependency) => {
      return sourceDependencies[dependency] > sMax ? sourceDependencies[dependency] : sMax;
    }, 0);
    return sourceMax > max ? sourceMax : max;
  }, 0);
}

function getDependencyEdges(dependencies: WeightedDependencyMap): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const maxEdgeDependencyWeight = getEdgeMaxDependencyWeight(dependencies);
  Object.keys(dependencies).forEach((source) => {
    const sourceDependencies = dependencies[source];
    Object.keys(sourceDependencies).forEach((dependency) => {
      // An interesting cohesion metric, but don't connect nodes to themselves.
      if (source === dependency) return;

      const dependencyWeight = sourceDependencies[dependency];

      const color = getWeightedColor(dependencyWeight, maxEdgeDependencyWeight);

      if (!color) {
        throw new Error('Color is undefined!');
      }

      edges.push({ source, dest: dependency, properties: `penwidth=3,color="${color}"` });
    });
  });
  return edges;
}

/**
 *
 * @param dependencies
 * @param valToSize
 * @param colorWithWeights - If undefined, the color will be deterimned by the weight on inward dependencies
 * @returns
 */
function getWeightedSizedNodes(
  dependencies: WeightedDependencyMap,
  valToSize: { [key: string]: number },
  colorWithWeights?: { [key: string]: number }
): GVNode[] {
  const nodes: GVNode[] = [];

  const maxSize = Object.values(valToSize).reduce((max, curr) => {
    return curr > max ? curr : max;
  }, 0);
  const colorWeights = colorWithWeights || getInwardDependencyWeights(dependencies);
  const maxColorWeight = Object.keys(colorWeights).reduce((maxDependencies, team) => {
    return colorWeights[team] > maxDependencies ? colorWeights[team] : maxDependencies;
  }, 0);
  Object.keys(dependencies).forEach((dep) => {
    const colorWeight = colorWeights[dep];
    const color = getWeightedColor(colorWeight, maxColorWeight);
    const safeDepName = getSafeName(dep);
    const nodeSize = valToSize[safeDepName];
    if (nodeSize === undefined) {
      throw new Error(`ValToSize had no entry for ${safeDepName}`);
    }
    const size = getRelativeSizeOfNode(nodeSize, maxSize);

    const properties = getNodeProperties(dep, color, size);
    nodes.push({ name: dep, properties });
  });
  return nodes;
}

function getInwardDependencyWeights(outwardDependencies: WeightedDependencyMap): {
  [key: string]: number;
} {
  const inwardDependencyWeights: { [key: string]: number } = {};
  const teams = Object.keys(outwardDependencies);
  teams.forEach((team) => {
    const dependencies = outwardDependencies[team];

    Object.keys(dependencies).forEach((dep) => {
      if (inwardDependencyWeights[dep] === undefined) {
        inwardDependencyWeights[dep] = 0;
      }
      inwardDependencyWeights[dep] += dependencies[dep];
    });
  });
  return inwardDependencyWeights;
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

export function getNodesSubGraphText(groupedNodes: GroupedNodes, color?: string) {
  let text = '';
  Object.keys(groupedNodes).forEach((groupName) => {
    const nodes = groupedNodes[groupName];
    text += `subgraph cluster${getSafeName(groupName)} {
      label="${groupName}"
      style=filled
      bgcolor="${color ? color : CURR_COLOR_SCHEME[0]}"
      fontcolor="${color ? getFontColor(color) : CURR_COLOR_SCHEME[4]}"
      `;
    text += getNodesText(nodes as GVNode[]);
    text += `}\n`;
  });
  return text;
}

export function getGroupedSizeMap(
  grouping: { [key: string]: string[] },
  sizes: { [key: string]: number }
): { [key: string]: number } {
  const groupSizes: { [key: string]: number } = {};
  Object.keys(grouping).forEach((group) => {
    groupSizes[group] = grouping[group].reduce((sum, sub) => {
      return sum + sizes[sub];
    }, 0);
  });
  return groupSizes;
}

function getNodesText(nodes: GVNode[]): string {
  let text = '';
  nodes.forEach(({ name, properties }) => {
    text += `${getSafeName(name)} ${properties ? `[${properties}]` : ''}\n`;
  });
  return text;
}

export function getGroupDependencies(
  dependencies: WeightedDependencyMap,
  higherGrouping: { [key: string]: string[] }
): WeightedDependencyMap {
  // eslint-disable-next-line no-console
  console.log('getGroupDependencies');
  const weightedGroupDependencyMap: WeightedDependencyMap = {};
  Object.keys(dependencies).forEach((key) => {
    const myDependencies = dependencies[key];

    const group = getGroupIBelongIn(key, higherGrouping);

    if (!weightedGroupDependencyMap[group]) {
      weightedGroupDependencyMap[group] = {};
    }
    const groupDependencyWithWeights = weightedGroupDependencyMap[group];

    Object.keys(myDependencies).forEach((dependency) => {
      const groupDepBelongsIn = getGroupIBelongIn(dependency, higherGrouping);
      if (!groupDependencyWithWeights[groupDepBelongsIn]) {
        groupDependencyWithWeights[groupDepBelongsIn] = 0;
      }
      groupDependencyWithWeights[groupDepBelongsIn] += dependencies[key][dependency];
    });
  });
  return weightedGroupDependencyMap;
}

export function getDiGraphTextWithSubClusters(
  dependencies: Array<{ source: string; dest: string }>,
  groupedNodes: GroupedNodes,
  color?: string
) {
  return `digraph test{
    ${getNodesSubGraphText(groupedNodes, color)}
     ${getDependenciesText(dependencies)}
  }`;
}

function getDiGraphText(dependencies: Array<{ source: string; dest: string }>, nodes: GVNode[]) {
  return `digraph test{
  ${getNodesText(nodes)}
   ${getDependenciesText(dependencies)}
}`;
}

export function getGroupIBelongIn(toFind: string, grouping: { [key: string]: string[] }): string {
  const safeName = getSafeName(toFind);
  const group = Object.keys(grouping).find((key) => {
    const elementsInGroup = grouping[key];
    const inGroup = elementsInGroup.find((element) => {
      if (element === safeName) return key;
    });
    if (inGroup) {
      return key;
    }
  });
  if (group) return group;

  throw new Error(
    `${safeName} did not belong to any group in: ${Object.keys(grouping).reduce((str, g) => {
      return (str += grouping[g].join(',') + '\n');
    })}, '')`
  );
}

export function getApiSizeByHigherGroup(
  groupedApiSizes: { [key: string]: number },
  higherGrouping: { [key: string]: string[] }
): { [key: string]: number } {
  // eslint-disable-next-line no-console
  console.log('getApiSizeByHigherGroup');
  const apiSizeByHigherGroup: { [key: string]: number } = {};

  Object.keys(groupedApiSizes).forEach((key) => {
    const apiSizeOfKey = groupedApiSizes[key];
    const higherGroupKey = getGroupIBelongIn(key, higherGrouping);

    if (apiSizeByHigherGroup[higherGroupKey] === undefined) {
      apiSizeByHigherGroup[higherGroupKey] = 0;
    }
    apiSizeByHigherGroup[higherGroupKey] += apiSizeOfKey;
  });
  return apiSizeByHigherGroup;
}
