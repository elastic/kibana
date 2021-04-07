/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const UNIFIED_TOOLBAR = 'labs:presentation:unifiedToolbar';

export const projectIDs = [UNIFIED_TOOLBAR] as const;
export const environmentNames = ['kibana', 'browser', 'session'] as const;
export const solutionNames = ['canvas', 'dashboard', 'presentation'] as const;

/**
 * This is a list of active Labs Projects for the Presentation Team.  It is the "source of truth" for all projects
 * provided to users of our solutions in Kibana.
 */
export const projects: { [ID in ProjectID]: ProjectConfig & { id: ID } } = {
  [UNIFIED_TOOLBAR]: {
    id: UNIFIED_TOOLBAR,
    isActive: false,
    environments: ['kibana', 'browser', 'session'],
    name: i18n.translate('presentationUtil.labs.enableUnifiedToolbarProjectName', {
      defaultMessage: 'Unified Toolbar',
    }),
    description: i18n.translate('presentationUtil.labs.enableUnifiedToolbarProjectDescription', {
      defaultMessage: 'Enable the new unified toolbar design for Presentation solutions',
    }),
    solutions: ['dashboard', 'canvas'],
  },
};

export type ProjectID = typeof projectIDs[number];
export type EnvironmentName = typeof environmentNames[number];
export type SolutionName = typeof solutionNames[number];

export type EnvironmentStatus = {
  [env in EnvironmentName]?: boolean;
};

export type ProjectStatus = {
  defaultValue: boolean;
  isEnabled: boolean;
  isOverride: boolean;
} & EnvironmentStatus;

export interface ProjectConfig {
  id: ProjectID;
  name: string;
  isActive: boolean;
  environments: EnvironmentName[];
  description: string;
  solutions: SolutionName[];
}

export type Project = ProjectConfig & { status: ProjectStatus };

export const getProjectIDs = () => projectIDs;

export const isProjectEnabledByStatus = (active: boolean, status: EnvironmentStatus): boolean => {
  // If the project is enabled by default, then any false flag will flip the switch, and vice-versa.
  return active
    ? Object.values(status).every((value) => value === true)
    : Object.values(status).some((value) => value === true);
};
