/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Decorator } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { ContentListClientProviderProps } from '@kbn/content-list-provider-client';
import {
  AskAgentContext,
  ContentListCoreContext,
  OpenInConsoleContext,
  ResourceLinksContext,
  ResourceTypesContext,
} from '../../metadata';
import { resourceTypes } from './fixtures';

const getLink = () => ({
  href: '#',
  onClick: (event: React.MouseEvent) => {
    event.preventDefault();
    action('open resource')();
  },
});

/** What the content list reads from core in Storybook, where there is no Kibana. */
const storyCore = {
  analytics: { reportEvent: () => undefined },
  i18n: {},
  theme: { theme$: {} },
  userProfile: { bulkGet: async () => [] },
  overlays: {
    openSystemFlyout: () => ({ onClose: Promise.resolve(), close: async () => undefined }),
  },
  notifications: { toasts: { addDanger: () => undefined } },
  rendering: { addContext: (element: React.ReactNode) => <>{element}</> },
  uiSettings: {
    get: <T,>(key: string): T => (key === 'savedObjects:listingLimit' ? 1000 : 20) as T,
  },
} as unknown as ContentListClientProviderProps['core'];

export const withResourceTypes: Decorator = (Story) => (
  <ContentListCoreContext.Provider value={storyCore}>
    <ResourceTypesContext.Provider value={resourceTypes}>
      <ResourceLinksContext.Provider value={getLink}>
        <AskAgentContext.Provider value={action('ask AI Agent')}>
          <OpenInConsoleContext.Provider
            value={{ opensInNewTab: () => false, open: action('open in Console') }}
          >
            <Story />
          </OpenInConsoleContext.Provider>
        </AskAgentContext.Provider>
      </ResourceLinksContext.Provider>
    </ResourceTypesContext.Provider>
  </ContentListCoreContext.Provider>
);
