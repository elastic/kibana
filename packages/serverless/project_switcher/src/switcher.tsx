/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ProjectType } from '@kbn/serverless-types';
import { ProjectSwitcher as Component } from './switcher.component';

import { useServices } from './services';
import type { ProjectSwitcherProps } from './types';

export const ProjectSwitcher = (props: ProjectSwitcherProps) => {
  const { setProjectType } = useServices();
  const onProjectChange = (projectType: ProjectType) => setProjectType(projectType);

  return <Component {...{ onProjectChange, ...props }} />;
};
