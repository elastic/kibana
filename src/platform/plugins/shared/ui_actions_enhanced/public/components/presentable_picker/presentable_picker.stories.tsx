/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { PresentablePicker } from './presentable_picker';

storiesOf('components/PresentablePicker', module)
  .add('One item', () => (
    <PresentablePicker
      items={[
        {
          id: 'URL',
          getDisplayName: () => 'Go to URL',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 10,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('Items are sorted', () => (
    <PresentablePicker
      items={[
        {
          id: 'item2',
          getDisplayName: () => 'Item 2',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 1,
          isCompatible: async (context?: object) => true,
        },
        {
          id: 'item1',
          getDisplayName: () => 'Item 1',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 2,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('Items are sorted - 2', () => (
    <PresentablePicker
      items={[
        {
          id: 'item1',
          getDisplayName: () => 'Item 1',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 2,
          isCompatible: async (context?: object) => true,
        },
        {
          id: 'item2',
          getDisplayName: () => 'Item 2',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 1,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('Two items', () => (
    <PresentablePicker
      items={[
        {
          id: 'URL',
          getDisplayName: () => 'Go to URL',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 2,
          isCompatible: async (context?: object) => true,
        },
        {
          id: 'DASHBOARD',
          getDisplayName: () => 'Go to Dashboard',
          getIconType: () => 'dashboardApp',
          getDisplayNameTooltip: () => '',
          order: 1,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('Beta badge', () => (
    <PresentablePicker
      items={[
        {
          id: 'URL',
          getDisplayName: () => 'Go to URL',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 2,
          isCompatible: async (context?: object) => true,
          isBeta: true,
        },
        {
          id: 'DASHBOARD',
          getDisplayName: () => 'Go to Dashboard',
          getIconType: () => 'dashboardApp',
          getDisplayNameTooltip: () => '',
          order: 1,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('Incompatible license', () => (
    <PresentablePicker
      items={[
        {
          id: 'URL',
          getDisplayName: () => 'Go to URL',
          getIconType: () => 'link',
          getDisplayNameTooltip: () => '',
          order: 2,
          isCompatible: async (context?: object) => true,
          isBeta: true,
          isLicenseCompatible: false,
        },
        {
          id: 'DASHBOARD',
          getDisplayName: () => 'Go to Dashboard',
          getIconType: () => 'dashboardApp',
          getDisplayNameTooltip: () => '',
          order: 1,
          isCompatible: async (context?: object) => true,
        },
      ]}
      context={{}}
      onSelect={action('onSelect')}
    />
  ));
