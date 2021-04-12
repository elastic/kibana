/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EnvironmentName, projectIDs, Project } from '../../../common';
import { PluginServiceFactory } from '../create';
import { projects, ProjectID, getProjectIDs } from '../../../common';
import { PresentationLabsService, isEnabledByStorageValue, applyProjectStatus } from '../labs';

export type LabsServiceFactory = PluginServiceFactory<PresentationLabsService>;

export const labsServiceFactory: LabsServiceFactory = () => {
  const storage = window.sessionStorage;

  const getProjects = () =>
    projectIDs.reduce((acc, id) => {
      acc[id] = getProject(id);
      return acc;
    }, {} as { [id in ProjectID]: Project });

  const getProject = (id: ProjectID) => {
    const project = projects[id];
    const { isActive } = project;
    const status = {
      session: isEnabledByStorageValue(project, 'session', sessionStorage.getItem(id)),
      browser: isEnabledByStorageValue(project, 'browser', localStorage.getItem(id)),
      kibana: isActive,
    };
    return applyProjectStatus(project, status);
  };

  const setProjectStatus = (name: ProjectID, env: EnvironmentName, enabled: boolean) => {
    if (env === 'session') {
      storage.setItem(name, enabled ? 'enabled' : 'disabled');
    }
  };

  const reset = () => {
    storage.clear();
  };

  return {
    getProjectIDs,
    getProjects,
    getProject,
    reset,
    setProjectStatus,
  };
};
