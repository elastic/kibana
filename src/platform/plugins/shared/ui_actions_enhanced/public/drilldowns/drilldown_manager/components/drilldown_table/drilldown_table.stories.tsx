/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { action } from '@storybook/addon-actions';
import { DrilldownTable } from './drilldown_table';
import { FlyoutFrame } from '../flyout_frame';

export default {
  title: 'components/ListManageDrilldowns',
};

export const Default = () => (
  <DrilldownTable
    items={[
      {
        id: '1',
        actionName: 'Dashboard',
        drilldownName: 'Drilldown 1',
        icon: 'dashboardApp',
        triggers: [{ title: 'trigger' }],
      },
      {
        id: '2',
        actionName: 'Dashboard',
        drilldownName: 'Drilldown 2',
        icon: 'dashboardApp',
        triggers: [{ title: 'trigger' }],
      },
      {
        id: '3',
        actionName: 'Dashboard',
        drilldownName: 'Drilldown 3',
        triggers: [{ title: 'trigger', description: 'trigger' }],
      },
    ]}
    onCreate={action('onCreate')}
    onDelete={action('onDelete')}
    onEdit={action('onEdit')}
  />
);

export const EmptyList = {
  render: () => (
    <DrilldownTable
      items={[]}
      onCreate={action('onCreate')}
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ),

  name: 'Empty list',
};

export const ASingleDrilldown = {
  render: () => (
    <DrilldownTable
      items={[
        {
          id: '1',
          actionName: 'Dashboard',
          drilldownName: 'Drilldown 1',
          icon: 'dashboardApp',
          triggers: [{ title: 'trigger' }],
        },
      ]}
      onCreate={action('onCreate')}
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ),

  name: 'A single drilldown',
};

export const InsideAFlyoutFrame = {
  render: () => (
    <FlyoutFrame title={'Some Title'} onClose={action('onClose')} banner={null}>
      <DrilldownTable
        items={[
          { id: '1', actionName: 'Dashboard', drilldownName: 'Drilldown 1' },
          { id: '2', actionName: 'Dashboard', drilldownName: 'Drilldown 2' },
          {
            id: '3',
            actionName: 'Dashboard',
            drilldownName: 'Drilldown 3',
            error: 'Some error...',
          },
        ]}
        onCreate={action('onCreate')}
        onDelete={action('onDelete')}
        onEdit={action('onEdit')}
      />
    </FlyoutFrame>
  ),

  name: 'Inside a flyout frame',
};
