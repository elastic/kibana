/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {ContentItemDetails, ContentTypeDetails} from '../registry';

export interface ContentTypeFixture {
  details: ContentTypeDetails;
  items: ContentItemDetails[];
}

const createTypeFixture = (partialDetails: Omit<ContentTypeDetails, 'operations'>, items: ContentItemDetails[]): ContentTypeFixture => {
  const details: ContentTypeDetails = {
    ...partialDetails,
    operations: {
      read: async (id: string) => {
        const item = items.find((item) => item.id === id);
        if (!item) throw new Error(`Unknown item: ${id}`);
        return item;
      },
      list: async () => items,
    }
  };

  return {
    details,
    items,
  };
};

const user: ContentTypeFixture = createTypeFixture(
  {
    id: 'user',
    name: 'User',
    description: 'A Kibana user',
    icon: 'user',
    kind: 'user',
  },
  [
    {
      id: '123',
      fields: {
        title: 'John Doe',
      },
      content: {},
    },
    {
      id: '456',
      fields: {
        title: 'Jane Doe',
      },
      content: {},
    },
    {
      id: '789',
      fields: {
        title: 'Captain America',
        color: '#aa3300',
      },
      content: {},
    },
  ],
);

const dashboard: ContentTypeFixture = createTypeFixture(
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Represents Kibana dashboards',
    icon: 'dashboardApp',
  },
  [
    {
      id: 'xyz',
      fields: {
        title: 'User subscription analytics dashboard',
        description: 'This dashboard shows the analytics of user subscriptions.',
      },
      content: {},
    },
    {
      id: 'abc',
      fields: {
        title: 'Threat detection dashboard',
        description: 'We use this dashboard to detect threats across our network.',
        color: '#0077ff',
      },
      content: {},
    },
  ],
);


export const types: Record<string, ContentTypeFixture> = {
  user,
  dashboard,
};
