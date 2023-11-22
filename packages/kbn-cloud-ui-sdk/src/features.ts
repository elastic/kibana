/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Feature {
  path: string;
  window: {
    name: string;
    height?: number;
    width?: number;
  };
}

export const FEATURE_PROJECTS_NAME = 'projects';
export type FeatureName = typeof FEATURE_PROJECTS_NAME;

export const FEATURE_CONFIGS: { [featureName in FeatureName]: Feature } = {
  [FEATURE_PROJECTS_NAME]: {
    path: 'embed/projects',
    window: { name: 'project-list', width: 925, height: 425 },
  },
};
