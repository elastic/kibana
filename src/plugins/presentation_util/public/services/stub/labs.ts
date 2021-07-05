/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  projects,
  projectIDs,
  ProjectID,
  EnvironmentName,
  getProjectIDs,
  Project,
  SolutionName,
} from '../../../common';
import { PluginServiceFactory } from '../create';
import { PresentationLabsService, isEnabledByStorageValue, applyProjectStatus } from '../labs';

export type LabsServiceFactory = PluginServiceFactory<PresentationLabsService>;

type Statuses = {
  [id in ProjectID]: {
    defaultValue: boolean;
    session: boolean | null;
    browser: boolean | null;
    kibana: boolean;
  };
};

export const labsServiceFactory: LabsServiceFactory = () => {
  let statuses = {} as Statuses;

  const getProject = (id: ProjectID) => {
    const project = projects[id];
    const value = statuses[id];
    const status = {
      session: isEnabledByStorageValue(project, 'session', value.session),
      browser: isEnabledByStorageValue(project, 'browser', value.browser),
      kibana: isEnabledByStorageValue(project, 'kibana', value.kibana),
    };

    return applyProjectStatus(project, status);
  };

  const reset = () =>
    projectIDs.reduce((acc, id) => {
      const project = projects[id];
      const defaultValue = project.isActive;

      acc[id] = {
        defaultValue,
        session: null,
        browser: null,
        kibana: defaultValue,
      };
      return acc;
    }, {} as Statuses);

  statuses = reset();

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

  const setProjectStatus = (id: ProjectID, env: EnvironmentName, value: boolean) => {
    statuses[id] = { ...statuses[id], [env]: value };
  };

  const isProjectEnabled = (id: ProjectID) => getProject(id).status.isEnabled;

  return {
    getProjectIDs,
    getProject,
    getProjects,
    isProjectEnabled,
    setProjectStatus,
    reset: () => {
      statuses = reset();
    },
  };
};
