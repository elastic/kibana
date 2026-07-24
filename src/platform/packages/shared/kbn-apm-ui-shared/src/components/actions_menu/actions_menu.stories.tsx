/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoryFn } from '@storybook/react';
import React from 'react';
import { ActionsMenu } from '.';

export default {
  title: 'shared/ActionsMenu',
  component: ActionsMenu,
};

export const FlatActions: StoryFn = () => (
  <ActionsMenu
    actions={[
      {
        id: 'main',
        actions: [
          {
            id: 'viewDetails',
            name: 'View details',
            icon: 'inspect',
            onClick: () => alert('View details'),
            ebt: { action: 'viewDetails', element: 'actionsMenu' },
          },
          {
            id: 'addToFilter',
            name: 'Add to filter',
            icon: 'filter',
            onClick: () => alert('Add to filter'),
            ebt: { action: 'addToFilter', element: 'actionsMenu' },
          },
          {
            id: 'openInDiscover',
            name: 'Open in Discover',
            icon: 'discoverApp',
            href: '#',
            ebt: { action: 'openInDiscover', element: 'actionsMenu' },
          },
        ],
      },
    ]}
  />
);

export const GroupedActions: StoryFn = () => (
  <ActionsMenu
    actions={[
      {
        id: 'investigate',
        groupLabel: 'Investigate',
        actions: [
          {
            id: 'viewDetails',
            name: 'View details',
            icon: 'inspect',
            onClick: () => alert('View details'),
            ebt: { action: 'viewDetails', element: 'actionsMenu' },
          },
          {
            id: 'openInDiscover',
            name: 'Open in Discover',
            icon: 'discoverApp',
            href: '#',
            ebt: { action: 'openInDiscover', element: 'actionsMenu' },
          },
        ],
      },
      {
        id: 'filter',
        groupLabel: 'Filter',
        actions: [
          {
            id: 'filterFor',
            name: 'Filter for value',
            icon: 'plusInCircle',
            onClick: () => alert('Filter for'),
            ebt: { action: 'filterFor', element: 'actionsMenu' },
          },
          {
            id: 'filterOut',
            name: 'Filter out value',
            icon: 'minusInCircle',
            onClick: () => alert('Filter out'),
            ebt: { action: 'filterOut', element: 'actionsMenu' },
          },
        ],
      },
    ]}
  />
);

export const WithSubPanel: StoryFn = () => (
  <ActionsMenu
    actions={[
      {
        id: 'main',
        actions: [
          {
            id: 'viewDetails',
            name: 'View details',
            icon: 'inspect',
            onClick: () => alert('View details'),
            ebt: { action: 'viewDetails', element: 'actionsMenu' },
          },
          {
            id: 'openIn',
            name: 'Open in…',
            icon: 'popout',
            ebt: { action: 'openIn', element: 'actionsMenu' },
            items: [
              {
                id: 'openInDiscover',
                name: 'Discover',
                icon: 'discoverApp',
                href: '#',
                ebt: { action: 'openInDiscover', element: 'actionsMenuSubPanel' },
              },
              {
                id: 'openInMaps',
                name: 'Maps',
                icon: 'gisApp',
                href: '#',
                ebt: { action: 'openInMaps', element: 'actionsMenuSubPanel' },
              },
            ],
          },
        ],
      },
    ]}
  />
);
