/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { mapValues } from 'lodash';

import {
  EnvironmentStatus,
  ExperimentConfig,
  ExperimentID,
  ExperimentStatus,
} from '../../../common';
import { applyExperimentStatus } from '../../services/experiments';
import { ExperimentListItem, Props } from './experiment_list_item';

import { experiments as experimentConfigs } from '../../../common';
import { ExperimentsList } from './experiments_list';

export default {
  title: 'Experiments/List',
  description: 'A set of controls for displaying and manipulating experiments.',
};

const experiments = mapValues(experimentConfigs, (experiment) =>
  applyExperimentStatus(experiment, { kibana: false, session: false, browser: false })
);

export function List() {
  return <ExperimentsList {...{ experiments }} onStatusChange={action('onStatusChange')} />;
}

export function EmptyList() {
  return (
    <ExperimentsList
      {...{ experiments }}
      solutions={[]}
      onStatusChange={action('onStatusChange')}
    />
  );
}

export const ListItem = (
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
    <div style={{ maxWidth: 800 }}>
      <ExperimentListItem
        experiment={applyExperimentStatus(experimentConfig, status)}
        onStatusChange={(_id, env, enabled) => ({ ...status, [env]: enabled })}
      />
    </div>
  );
};

ListItem.args = {
  isActive: false,
  name: 'Demo Experiment',
  description: 'This is a demo experiment, and this is the description of the demo experiment.',
  kibana: false,
  browser: false,
  session: false,
  solutions: ['dashboard', 'canvas'],
  environments: ['kibana', 'browser', 'session'],
};

ListItem.argTypes = {
  environments: {
    control: {
      type: 'check',
      options: ['kibana', 'browser', 'session'],
    },
  },
};
