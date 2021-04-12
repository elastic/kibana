/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  environmentNames,
  EnvironmentName,
  projectIDs,
  projects,
  ProjectID,
  Project,
  getProjectIDs,
} from '../../../common';
import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import {
  PresentationLabsService,
  isEnabledByStorageValue,
  setStorageStatus,
  setUISettingsStatus,
  applyProjectStatus,
} from '../labs';

export type LabsServiceFactory = KibanaPluginServiceFactory<
  PresentationLabsService,
  PresentationUtilPluginStartDeps
>;

export const labsServiceFactory: LabsServiceFactory = ({ coreStart }) => {
  const { uiSettings } = coreStart;
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;

  const getProjects = () =>
    projectIDs.reduce((acc, id) => {
      acc[id] = getProject(id);
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
    localStorage.clear();
    sessionStorage.clear();
    environmentNames.forEach((env) =>
      projectIDs.forEach((id) => setProjectStatus(id, env, projects[id].isActive))
    );
  };

  return {
    getProjectIDs,
    getProjects,
    getProject,
    reset,
    setProjectStatus,
  };
};
