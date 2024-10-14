/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProjectType } from '@kbn/serverless-types';

/**
 * A list of services that are consumed by this component.
 */
export interface Services {
  setProjectType: (projectType: ProjectType) => void;
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
export interface KibanaDependencies {
  coreStart: {
    http: {
      post: (path: string, options: { body: string }) => Promise<unknown>;
    };
  };
  projectChangeAPIUrl: string;
}

/**
 * Props for the `ProjectSwitcher` pure component.
 */
export interface ProjectSwitcherComponentProps {
  onProjectChange: (projectType: ProjectType) => void;
  currentProjectType: ProjectType;
}

export type ProjectSwitcherProps = Pick<ProjectSwitcherComponentProps, 'currentProjectType'>;
