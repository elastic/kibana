/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'presentationUtil';
export const PLUGIN_NAME = 'presentationUtil';

/**
 * The unique identifier for the Expressions Language for use in the ExpressionInput
 * and CodeEditor components.
 */
export const EXPRESSIONS_LANGUAGE_ID = 'kibana-expressions';

export type {
  EnvironmentName,
  EnvironmentStatus,
  Project,
  ProjectConfig,
  ProjectID,
  ProjectStatus,
  SolutionName,
} from './labs';

export {
  LABS_PROJECT_PREFIX,
  environmentNames,
  projectIDs,
  projects,
  getProjectIDs,
  isProjectEnabledByStatus,
} from './labs';

export {
  defaultTheme$,
  getElasticLogo,
  getElasticOutline,
  isValidUrl,
  isValidHttpUrl,
  resolveWithMissingImage,
  resolveFromArgs,
  encode,
  parseDataUrl,
} from './lib';
