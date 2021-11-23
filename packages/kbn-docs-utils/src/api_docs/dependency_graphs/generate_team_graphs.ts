/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginOrPackage } from '../types';
import { GroupToSubOrg, GroupToTeam, SubOrgToOrg, TeamToSize } from './team_grouping_consts';
import {
  getApiSizeByHigherGroup,
  getGroupDependencies,
  getGroupedSizeMap,
  WeightedDependencyMap,
  writeWeightedDependencyDotFile,
} from './generate_weighted_dot_file';
import { PluginStatsMap } from './types';

export function generateTeamGraphs(
  plugins: PluginOrPackage[],
  pluginStats: PluginStatsMap,
  teamDependencies: WeightedDependencyMap
) {
  const teamApiSize = getApiSizeByTeam(plugins, pluginStats);

  writeWeightedDependencyDotFile(teamDependencies, TeamToSize, 'teamColorApiSize', teamApiSize);
  writeWeightedDependencyDotFile(teamDependencies, TeamToSize, 'teamColorDep');

  const groupApiSize = getApiSizeByHigherGroup(teamApiSize, GroupToTeam);
  const groupDependencyMap = getGroupDependencies(teamDependencies, GroupToTeam);
  const groupSizes = getGroupedSizeMap(GroupToTeam, TeamToSize);

  writeWeightedDependencyDotFile(groupDependencyMap, groupSizes, 'groupColorApiSize', groupApiSize);
  writeWeightedDependencyDotFile(groupDependencyMap, groupSizes, 'groupColorDep');

  const subOrgApiSize = getApiSizeByHigherGroup(groupApiSize, GroupToSubOrg);
  const subOrgDependencyMap = getGroupDependencies(groupDependencyMap, GroupToSubOrg);
  const subOrgSizes = getGroupedSizeMap(GroupToSubOrg, groupSizes);

  writeWeightedDependencyDotFile(
    subOrgDependencyMap,
    subOrgSizes,
    'subOrgColorApiSize',
    subOrgApiSize
  );
  writeWeightedDependencyDotFile(subOrgDependencyMap, subOrgSizes, 'subOrgColorDep');

  const orgApiSize = getApiSizeByHigherGroup(subOrgApiSize, SubOrgToOrg);
  const orgDependencyMap = getGroupDependencies(subOrgDependencyMap, SubOrgToOrg);
  const orgSizes = getGroupedSizeMap(SubOrgToOrg, subOrgSizes);

  writeWeightedDependencyDotFile(orgDependencyMap, orgSizes, 'orgColorApiSize', orgApiSize);
  writeWeightedDependencyDotFile(orgDependencyMap, orgSizes, 'orgColorDep');
}

function getApiSizeByTeam(
  plugins: PluginOrPackage[],
  pluginStats: PluginStatsMap
): { [key: string]: number } {
  const apiSizeByTeam: { [key: string]: number } = {};

  plugins.forEach((plugin) => {
    if (!plugin.isPlugin) return;
    const teamOwner = plugin.manifest.owner.name;
    if (apiSizeByTeam[teamOwner] === undefined) {
      apiSizeByTeam[teamOwner] = 0;
    }
    apiSizeByTeam[teamOwner] += pluginStats[plugin.manifest.id].apiCount;
  });
  return apiSizeByTeam;
}
