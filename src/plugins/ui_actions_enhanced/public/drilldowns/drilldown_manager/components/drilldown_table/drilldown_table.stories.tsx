/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DrilldownTable } from './drilldown_table';
import { FlyoutFrame } from '../flyout_frame';

storiesOf('components/ListManageDrilldowns', module)
  .add('Default', () => (
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
  ))
  .add('Empty list', () => (
    <DrilldownTable
      items={[]}
      onCreate={action('onCreate')}
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ))
  .add('A single drilldown', () => (
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
  ))
  .add('Inside a flyout frame', () => (
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
  ));
