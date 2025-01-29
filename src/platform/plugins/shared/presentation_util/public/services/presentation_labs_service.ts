/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  EnvironmentName,
  EnvironmentStatus,
  LABS_PROJECT_PREFIX,
  Project,
  ProjectConfig,
  ProjectID,
  SolutionName,
  isProjectEnabledByStatus,
  projectIDs,
  projects,
} from '../../common';
import { coreServices } from './kibana_services';

export interface PresentationLabsService {
  isProjectEnabled: (id: ProjectID) => boolean;
  getProject: (id: ProjectID) => Project;
  getProjects: (solutions?: SolutionName[]) => Record<ProjectID, Project>;
  setProjectStatus: (id: ProjectID, env: EnvironmentName, status: boolean) => void;
  reset: () => void;
}

export const getPresentationLabsService = (): PresentationLabsService => {
  const { uiSettings } = coreServices;
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;

  const getProjects = (solutions: SolutionName[] = []) =>
    projectIDs.reduce((acc, id) => {
      const project = getProject(id);
      if (
        solutions.length === 0 ||
        solutions.some((solution) => project.solutions.includes(solution))
      ) {
        acc[id] = project;
      }
      return acc;
    }, {} as { [id in ProjectID]: Project });

  const getProject = (id: ProjectID) => {
    const project = projects[id];

    const status = {
      session: isEnabledByStorageValue(project, 'session', sessionStorage.getItem(id)),
      browser: isEnabledByStorageValue(project, 'browser', localStorage.getItem(id)),
      kibana: isEnabledByStorageValue(project, 'kibana', uiSettings.get(id, project.isActive)),
    };

    return applyProjectStatus(project, status);
  };

  const setProjectStatus = (name: ProjectID, env: EnvironmentName, status: boolean) => {
    switch (env) {
      case 'session':
        setStorageStatus(sessionStorage, name, status);
        break;
      case 'browser':
        setStorageStatus(localStorage, name, status);
        break;
      case 'kibana':
        setUISettingsStatus(uiSettings, name, status);
        break;
    }
  };

  const reset = () => {
    clearLabsFromStorage(localStorage);
    clearLabsFromStorage(sessionStorage);
    projectIDs.forEach((id) => setProjectStatus(id, 'kibana', projects[id].isActive));
  };

  const isProjectEnabled = (id: ProjectID) => getProject(id).status.isEnabled;

  return {
    getProjects,
    getProject,
    isProjectEnabled,
    reset,
    setProjectStatus,
  };
};

/**
 * Helpers
 */
const isEnabledByStorageValue = (
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

const setStorageStatus = (storage: Storage, id: ProjectID, enabled: boolean) =>
  storage.setItem(id, enabled ? 'enabled' : 'disabled');

export const applyProjectStatus = (project: ProjectConfig, status: EnvironmentStatus): Project => {
  const { isActive, environments } = project;

  environments.forEach((name) => {
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

const setUISettingsStatus = (client: IUiSettingsClient, id: ProjectID, enabled: boolean) =>
  client.set(id, enabled);

const clearLabsFromStorage = (storage: Storage) => {
  projectIDs.forEach((projectID) => storage.removeItem(projectID));

  // This is a redundancy, to catch any labs that may have been removed above.
  // We could consider gathering telemetry to see how often this happens, or this may be unnecessary.
  Object.keys(storage)
    .filter((key) => key.startsWith(LABS_PROJECT_PREFIX))
    .forEach((key) => storage.removeItem(key));
};
