/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  KIBANA_SOLUTIONS,
  type ModuleGroup,
  type ModuleVisibility,
} from '@kbn/projects-solutions-groups';

interface ModuleAttrs {
  group: ModuleGroup;
  visibility: ModuleVisibility;
}

const DEFAULT_MODULE_ATTRS: ModuleAttrs = {
  group: 'common',
  visibility: 'shared',
};

const MODULE_GROUPING_BY_PATH: Record<string, ModuleAttrs> = ['packages', 'plugins']
  .map<Record<string, ModuleAttrs>>((type) => ({
    [`src/platform/${type}/shared`]: {
      group: 'platform',
      visibility: 'shared',
    },
    [`src/platform/${type}/private`]: {
      group: 'platform',
      visibility: 'private',
    },
    [`x-pack/platform/${type}/shared`]: {
      group: 'platform',
      visibility: 'shared',
    },
    [`x-pack/platform/${type}/private`]: {
      group: 'platform',
      visibility: 'private',
    },
    ...KIBANA_SOLUTIONS.reduce<Record<string, ModuleAttrs>>((acc, solution) => {
      acc[`x-pack/solutions/${solution}/${type}`] = {
        group: solution,
        visibility: 'private',
      };
      acc[`x-pack/solutions/${solution}/test`] = {
        group: solution,
        visibility: 'private',
      };
      return acc;
    }, {}),
  }))
  .reduce((acc, current) => ({ ...acc, ...current }), {
    'src/platform/test': {
      group: 'platform',
      visibility: 'shared',
    },
    'x-pack/platform/test': {
      group: 'platform',
      visibility: 'shared',
    },
  });

/**
 * Determine a plugin's grouping information based on the path where it is defined
 * @param packageRelativePath the path in the repo where the package is located
 * @returns The grouping information that corresponds to the given path
 */
export function inferGroupAttrsFromPath(packageRelativePath: string): ModuleAttrs {
  const grouping = Object.entries(MODULE_GROUPING_BY_PATH).find(([chunk]) =>
    packageRelativePath.startsWith(chunk)
  )?.[1];
  return grouping ?? DEFAULT_MODULE_ATTRS;
}
