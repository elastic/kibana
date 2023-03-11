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

import { EnvironmentStatus, ProjectConfig, ProjectID, ProjectStatus } from '../../../common';
import { applyProjectStatus } from '../../services/labs/types';
import { ProjectListItem, Props } from './project_list_item';

import { projects as projectConfigs } from '../../../common';
import { ProjectList } from './project_list';

export default {
  title: 'Labs/ProjectList',
  description: 'A set of controls for displaying and manipulating projects.',
};

const projects = mapValues(projectConfigs, (project) =>
  applyProjectStatus(project, { kibana: false, session: false, browser: false })
);

export function List() {
  return <ProjectList {...{ projects }} onStatusChange={action('onStatusChange')} />;
}

export function EmptyList() {
  return <ProjectList {...{ projects }} solutions={[]} onStatusChange={action('onStatusChange')} />;
}

export const ListItem = (
  props: Pick<
    Props['project'],
    'description' | 'isActive' | 'name' | 'solutions' | 'environments' | 'isDisplayed'
  > &
    Omit<ProjectStatus, 'defaultValue'>
) => {
  const { kibana, browser, session, ...rest } = props;
  const status: EnvironmentStatus = { kibana, browser, session };
  const projectConfig: ProjectConfig = {
    ...rest,
    id: 'storybook:component' as ProjectID,
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <ProjectListItem
        project={applyProjectStatus(projectConfig, status)}
        onStatusChange={(_id, env, enabled) => ({ ...status, [env]: enabled })}
      />
    </div>
  );
};

ListItem.args = {
  isActive: false,
  name: 'Demo Project',
  description: 'This is a demo project, and this is the description of the demo project.',
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
