/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { SolutionNav as Component, SolutionNavProps } from './solution_nav';

export default {
  title: 'Page/Solution Nav',
  description: 'Solution-specific navigation for the sidebar',
};

type Params = Pick<SolutionNavProps, 'name' | 'icon'>;

const items: SolutionNavProps['items'] = [
  {
    name: <div>Ingest</div>,
    id: '1',
    items: [
      {
        name: 'Ingest Node Pipelines',
        id: '1.1',
      },
      {
        name: 'Logstash Pipelines',
        id: '1.2',
      },
      {
        name: 'Beats Central Management',
        id: '1.3',
      },
    ],
  },
  {
    name: 'Data',
    id: '2',
    items: [
      {
        name: 'Index Management',
        id: '2.1',
      },
      {
        name: 'Index Lifecycle Policies',
        id: '2.2',
      },
      {
        name: 'Snapshot and Restore',
        id: '2.3',
      },
    ],
  },
];

export const SolutionNav = (params: Params) => {
  return (
    <Component items={items} isOpenOnDesktop={true} {...params} onCollapse={action('onCollapse')} />
  );
};

SolutionNav.argTypes = {
  name: {
    control: 'text',
    defaultValue: 'Kibana',
  },
  icon: {
    control: { type: 'radio' },
    options: ['logoKibana', 'logoObservability', 'logoSecurity'],
    defaultValue: 'logoKibana',
  },
  children: {
    control: 'text',
    defaultValue: '',
  },
  canBeCollapsed: {
    control: 'boolean',
    defaultValue: true,
  },
};

SolutionNav.parameters = {
  layout: 'fullscreen',
};
