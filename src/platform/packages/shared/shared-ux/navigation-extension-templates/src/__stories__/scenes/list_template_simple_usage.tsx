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
import React from 'react';
import { ListTemplate } from '../../templates/list_template';

interface ListTemplateData {
  id: string;
  label: string;
  href: string;
}

export const ListTemplateUsage: StoryObj<typeof ListTemplate<ListTemplateData>> = {
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
      item: {
        idField: 'id',
        labelField: 'label',
        hrefField: 'href',
      },
      max: 5,
    },
    context: {
      slotId: 'slotId',
      extensionId: 'extensionId',
    },
    onAction: () => {},
  },
};

ListTemplateUsage.parameters = { docs: { disable: true } };
