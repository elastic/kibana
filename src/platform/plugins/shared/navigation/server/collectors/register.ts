/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface NavigationCustomizationUsage {
  customizations: Array<{
    solution_type: string;
    hidden_items: string[];
    order_of_items: string[];
  }>;
}

export const registerNavigationUsageCollector = (usageCollection: UsageCollectionSetup): void => {
  const collector = usageCollection.makeUsageCollector<NavigationCustomizationUsage>({
    type: 'navigation_customization',
    isReady: () => true,
    schema: {
      customizations: {
        type: 'array',
        items: {
          solution_type: {
            type: 'keyword',
            _meta: {
              description: 'The solution type for this customization.',
            },
          },
          hidden_items: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: { description: 'List of navigation items hidden by the user.' },
            },
          },
          order_of_items: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: { description: 'List of navigation items in the user-defined order.' },
            },
          },
        },
      },
    },
    fetch: async () => {
      // TODO: Replace with userStorage
      return {
        customizations: [],
      };
    },
  });

  usageCollection.registerCollector(collector);
};
