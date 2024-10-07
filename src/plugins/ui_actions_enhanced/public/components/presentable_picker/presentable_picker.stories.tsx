/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { PresentablePicker } from './presentable_picker';

export default {
  title: 'components/PresentablePicker',
};

export const OneItem = () => (
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
);

OneItem.story = {
  name: 'One item',
};

export const ItemsAreSorted = () => (
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
);

ItemsAreSorted.story = {
  name: 'Items are sorted',
};

export const ItemsAreSorted2 = () => (
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
);

ItemsAreSorted2.story = {
  name: 'Items are sorted - 2',
};

export const TwoItems = () => (
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
);

TwoItems.story = {
  name: 'Two items',
};

export const BetaBadge = () => (
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
);

BetaBadge.story = {
  name: 'Beta badge',
};

export const IncompatibleLicense = () => (
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
);

IncompatibleLicense.story = {
  name: 'Incompatible license',
};
