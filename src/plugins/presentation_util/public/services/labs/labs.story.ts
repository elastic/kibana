/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EnvironmentName, projectIDs, Project } from '../../../common';
import { PluginServiceFactory } from '../create';
import { projects, ProjectID, getProjectIDs, SolutionName } from '../../../common';
import { PresentationLabsService, isEnabledByStorageValue, applyProjectStatus } from './types';

export type LabsServiceFactory = PluginServiceFactory<PresentationLabsService>;

export const labsServiceFactory: LabsServiceFactory = () => {
  const storage = window.sessionStorage;

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
    // This is normally not ok, but it's our isolated Storybook instance.
    storage.clear();
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
