/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';

import type { ProjectSwitcherProps, Services } from '../src/types';

type PropArguments = Pick<ProjectSwitcherProps, 'currentProjectType'>;

/**
 * Storybook parameters provided from the controls addon.
 */
export type ProjectSwitcherStorybookParams = Record<keyof PropArguments, any>;

/**
 * Storybook mocks for the `NoDataCard` component.
 */
export class ProjectSwitcherStorybookMock extends AbstractStorybookMock<
  ProjectSwitcherProps,
  Services,
  PropArguments,
  {}
> {
  propArguments = {
    currentProjectType: {
      control: { type: 'radio' },
      options: ['observability', 'security', 'search'],
      defaultValue: 'observability',
    },
  };
  serviceArguments = {};
  dependencies = [];

  getProps(params?: ProjectSwitcherStorybookParams): ProjectSwitcherProps {
    return {
      currentProjectType: this.getArgumentValue('currentProjectType', params),
    };
  }

  getServices(_params: ProjectSwitcherStorybookParams): Services {
    return {
      setProjectType: action('setProjectType'),
    };
  }
}
