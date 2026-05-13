/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { NotificationEventsProvider } from '@kbn/core-notifications-browser-hooks';

/**
 * Renders the notification stack management page into the given DOM element.
 * Called from the plugin's `core.application.register` mount callback.
 * Returns an unmount cleanup function.
 */
export async function renderApp(
  element: HTMLElement,
  coreStart: CoreStart,
  spaces: SpacesPluginStart | undefined
): Promise<() => void> {
  const events = coreStart.notifications.events;
  const { StackManagementPage } = await import('./stack_management_page');

  ReactDOM.render(
    coreStart.rendering.addContext(
      <NotificationEventsProvider events={events} spaces={spaces}>
        <StackManagementPage />
      </NotificationEventsProvider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
