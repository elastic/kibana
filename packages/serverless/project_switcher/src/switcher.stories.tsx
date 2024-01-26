/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  ProjectSwitcherStorybookMock,
  type ProjectSwitcherStorybookParams,
} from '../mocks/storybook.mock';

import { ProjectSwitcher as Component } from './switcher';
import { ProjectSwitcherProvider as Provider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'Developer/Project Switcher',
  description: '',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new ProjectSwitcherStorybookMock();
const argTypes = mock.getArgumentTypes();

export const ProjectSwitcher = (params: ProjectSwitcherStorybookParams) => {
  return (
    <Provider {...mock.getServices(params)}>
      <Component {...params} />
    </Provider>
  );
};

ProjectSwitcher.argTypes = argTypes;
