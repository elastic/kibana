/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { faker } from '@faker-js/faker';
import type { StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ListTemplate } from '../../templates/list_template';

interface ListTemplateData {
  id: string;
  label: string;
  href: string;
}

export const ListTemplateRobustUsage: StoryObj<typeof ListTemplate<ListTemplateData>> = {
  render: function ListTemplateWrapper(args) {
    return <ListTemplate {...args} />;
  },
  args: {
    data: Array.from({ length: 10 }, () => ({
      id: faker.string.uuid(),
      label: faker.lorem.word(),
      href: faker.internet.url(),
    })),
    config: {
      heading: 'List Template Robust Usage',
      supportAddItem: true,
      search: { enabled: true, placeholder: 'Search the list' },
      actions: [
        {
          id: 'delete',
          label: 'Delete',
          icon: 'trash',
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: 'pencil',
        },
        {
          id: 'copy',
          label: 'Copy',
          icon: 'copy',
        },
      ],
      item: {
        idField: 'id',
        labelField: 'label',
        hrefField: 'href',
      },
    },
    context: {
      slotId: 'slotId',
      extensionId: 'extensionId',
      primaryItemId: 'primaryItemId',
      sectionId: 'sectionId',
      surface: 'sidePanel',
    },
    onAction: action('onAction'),
  },
};

ListTemplateRobustUsage.parameters = { docs: { disable: true } };
