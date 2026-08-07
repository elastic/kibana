/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { CPSProject } from '../../../types';

const ALIAS_FIELD_PREFIX = '_alias:';
const ALIAS_ORIGIN_TOKEN = '_origin';
const ALIAS_OPERATOR = ' OR ';

const getProjectByAlias = (
  availableProjects: CPSProject[],
  alias: string
): CPSProject | undefined => availableProjects.find((project) => project._alias === alias);

const getAliasTokensFromProjectRouting = (
  projectRouting: NonNullable<ProjectRouting>
): string[] | undefined => {
  if (!projectRouting.startsWith(ALIAS_FIELD_PREFIX)) {
    return undefined;
  }

  const aliasExpression = projectRouting.slice(ALIAS_FIELD_PREFIX.length);

  if (aliasExpression.startsWith('(') && aliasExpression.endsWith(')')) {
    return aliasExpression
      .slice(1, -1)
      .split(ALIAS_OPERATOR)
      .map((alias) => alias.trim())
      .filter(Boolean);
  }

  return [aliasExpression];
};

export const getSelectedProjectIdsFromProjectRouting = ({
  availableProjects,
  originProjectId,
  projectRouting,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  projectRouting?: ProjectRouting;
}): string[] => {
  if (projectRouting === undefined || projectRouting === PROJECT_ROUTING.ALL) {
    return availableProjects.map((project) => project._id);
  }

  if (projectRouting === PROJECT_ROUTING.ORIGIN) {
    return originProjectId ? [originProjectId] : [];
  }

  const aliasTokens = getAliasTokensFromProjectRouting(projectRouting);
  if (!aliasTokens) {
    return availableProjects.map((project) => project._id);
  }

  const selectedProjectIds = aliasTokens
    .map((alias) => {
      if (alias === ALIAS_ORIGIN_TOKEN) {
        return originProjectId;
      }

      return getProjectByAlias(availableProjects, alias)?._id;
    })
    .filter((id): id is string => id !== undefined);

  return selectedProjectIds.length > 0
    ? selectedProjectIds
    : availableProjects.map((project) => project._id);
};

export const getProjectRoutingFromSelectedProjectIds = ({
  availableProjects,
  originProjectId,
  selectedProjectIds,
}: {
  availableProjects: CPSProject[];
  originProjectId?: string;
  selectedProjectIds: string[];
}): ProjectRouting => {
  if (selectedProjectIds.length === availableProjects.length) {
    return PROJECT_ROUTING.ALL;
  }

  if (
    originProjectId !== undefined &&
    selectedProjectIds.length === 1 &&
    selectedProjectIds[0] === originProjectId
  ) {
    return PROJECT_ROUTING.ORIGIN;
  }

  const selectedProjectAliases = selectedProjectIds
    .map((projectId) => {
      if (projectId === originProjectId) {
        return ALIAS_ORIGIN_TOKEN;
      }

      return availableProjects.find((project) => project._id === projectId)?._alias;
    })
    .filter((alias): alias is string => alias !== undefined);

  if (selectedProjectAliases.length === 0) {
    return PROJECT_ROUTING.ALL;
  }

  if (selectedProjectAliases.length === 1) {
    return `${ALIAS_FIELD_PREFIX}${selectedProjectAliases[0]}`;
  }

  return `${ALIAS_FIELD_PREFIX}(${selectedProjectAliases.join(ALIAS_OPERATOR)})`;
};
