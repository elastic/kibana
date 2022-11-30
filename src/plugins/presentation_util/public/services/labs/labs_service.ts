/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EnvironmentName,
  projectIDs,
  projects,
  ProjectID,
  Project,
  getProjectIDs,
  SolutionName,
  LABS_PROJECT_PREFIX,
} from '../../../common';
import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import {
  PresentationLabsService,
  isEnabledByStorageValue,
  setStorageStatus,
  setUISettingsStatus,
  applyProjectStatus,
} from './types';

export type LabsServiceFactory = KibanaPluginServiceFactory<
  PresentationLabsService,
  PresentationUtilPluginStartDeps
>;

const clearLabsFromStorage = (storage: Storage) => {
  projectIDs.forEach((projectID) => storage.removeItem(projectID));

  // This is a redundancy, to catch any labs that may have been removed above.
  // We could consider gathering telemetry to see how often this happens, or this may be unnecessary.
  Object.keys(storage)
    .filter((key) => key.startsWith(LABS_PROJECT_PREFIX))
    .forEach((key) => storage.removeItem(key));
};

export const labsServiceFactory: LabsServiceFactory = ({ coreStart }) => {
  const { uiSettings } = coreStart;
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
    getProjectIDs,
    getProjects,
    getProject,
    isProjectEnabled,
    reset,
    setProjectStatus,
  };
};
