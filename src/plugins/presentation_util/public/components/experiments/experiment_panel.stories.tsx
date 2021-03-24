/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EnvironmentStatus,
  ExperimentConfig,
  ExperimentID,
  ExperimentStatus,
} from '../../../common';
import { applyExperimentStatus } from '../../services/experiments';
import { ExperimentPanel, Props } from './experiment_panel';

export default {
  component: ExperimentPanel,
  title: 'Experiment Panel',
  description: '',
  argTypes: {
    environments: {
      control: {
        type: 'check',
        options: ['kibana', 'browser', 'session'],
      },
    },
  },
};

export const Component = (
  props: Pick<
    Props['experiment'],
    'description' | 'isActive' | 'name' | 'solutions' | 'environments'
  > &
    Omit<ExperimentStatus, 'defaultValue'>
) => {
  const { kibana, browser, session, ...rest } = props;
  const status: EnvironmentStatus = { kibana, browser, session };
  const experimentConfig: ExperimentConfig = {
    ...rest,
    id: 'storybook:component' as ExperimentID,
  };

  return (
    <ExperimentPanel
      experiment={applyExperimentStatus(experimentConfig, status)}
      onStatusChange={(_id, env, enabled) => ({ ...status, [env]: enabled })}
    />
  );
};

Component.args = {
  isActive: false,
  name: 'Demo Experiment',
  description: 'This is a demo experiment, and this is the description of the demo experiment.',
  kibana: false,
  browser: false,
  session: false,
  solutions: ['dashboard', 'canvas'],
  environments: ['kibana', 'browser', 'session'],
};
