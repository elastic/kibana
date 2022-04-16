/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import {
  EnvironmentName,
  projectIDs,
  Project,
  ProjectConfig,
  ProjectID,
  EnvironmentStatus,
  environmentNames,
  isProjectEnabledByStatus,
  SolutionName,
} from '../../common';

export interface PresentationLabsService {
  isProjectEnabled: (id: ProjectID) => boolean;
  getProjectIDs: () => typeof projectIDs;
  getProject: (id: ProjectID) => Project;
  getProjects: (solutions?: SolutionName[]) => Record<ProjectID, Project>;
  setProjectStatus: (id: ProjectID, env: EnvironmentName, status: boolean) => void;
  reset: () => void;
}

export const isEnabledByStorageValue = (
  project: ProjectConfig,
  environment: EnvironmentName,
  value: string | boolean | null
): boolean => {
  const defaultValue = project.isActive;

  if (!project.environments.includes(environment)) {
    return defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  if (value === 'enabled') {
    return true;
  }

  if (value === 'disabled') {
    return false;
  }

  return defaultValue;
};

export const setStorageStatus = (storage: Storage, id: ProjectID, enabled: boolean) =>
  storage.setItem(id, enabled ? 'enabled' : 'disabled');

export const applyProjectStatus = (project: ProjectConfig, status: EnvironmentStatus): Project => {
  const { isActive, environments } = project;

  environmentNames.forEach((name) => {
    if (!environments.includes(name)) {
      delete status[name];
    }
  });

  const isEnabled = isProjectEnabledByStatus(isActive, status);
  const isOverride = isEnabled !== isActive;

  return {
    ...project,
    status: {
      ...status,
      defaultValue: isActive,
      isEnabled,
      isOverride,
    },
  };
};

export const setUISettingsStatus = (client: IUiSettingsClient, id: ProjectID, enabled: boolean) =>
  client.set(id, enabled);
