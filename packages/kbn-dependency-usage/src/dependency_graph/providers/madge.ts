/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
// @ts-ignore
// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
import madge from 'madge';
import { createCollapseRegexWithDepth } from '../../lib/collapse_with_depth.ts';
import { aggregationGroups, excludePaths } from '../common/constants.ts';

export const identifyDependencyUsageWithMadge = async (
  paths: string[],
  dependencyName: string | undefined,
  { collapseDepth }: { groupBy?: string; summary?: boolean; collapseDepth: number }
) => {
  const response = await madge(paths, {
    fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    includeNpm: true,
    baseDir: '.',
    excludeRegExp: excludePaths,
    dependencyFilter: (_path: string) => {
      return /node_modules/.test(_path);
    },
  });

  console.log(
    `${chalk.green(`Successfully`)} built dependency graph using ${chalk.bold.magenta(
      'madge'
    )}. Analyzing...`
  );

  const dependencies = response.obj();

  const collapseRules = aggregationGroups.map((group) =>
    createCollapseRegexWithDepth(group, collapseDepth)
  );

  const pluginRegex = new RegExp(collapseRules.join('|'));

  const depList = Object.keys(dependencies).reduce<Record<string, Set<string>>>((acc, key) => {
    const modules = dependencies[key];
    const [pluginName] = key.match(pluginRegex) || ['unknown'];

    if (!acc[pluginName] && modules.length) {
      acc[pluginName] = new Set();
    }

    for (const module of modules) {
      const [, name] = module.match(/node_modules\/(@[^\/]+\/[^\/]+|[^\/]+)/) || [];
      acc[pluginName].add(name);
    }

    return acc;
  }, {});

  const result = Object.fromEntries(
    Object.entries(depList).map(([key, value]) => [key, Array.from(value)])
  );

  return result;
};
