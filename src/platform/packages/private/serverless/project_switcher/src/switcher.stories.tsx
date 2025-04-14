/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
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
} as Meta;

const mock = new ProjectSwitcherStorybookMock();
const argTypes = mock.getArgumentTypes();

export const ProjectSwitcher: StoryObj<ProjectSwitcherStorybookParams> = {
  render: (params) => {
    return (
      <Provider {...mock.getServices(params)}>
        <Component {...params} />
      </Provider>
    );
  },

  argTypes,
};
