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
import { type Observable, of } from 'rxjs';
import { map } from 'rxjs';
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { NotificationEventsProvider } from '@kbn/core-notifications-browser-hooks';
import { registerDemoTypes } from './event_types';
import { notificationCenterAppId } from './notification_center_app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  spaces?: SpacesPluginSetup;
}

interface StartDeps {
  spaces?: SpacesPluginStart;
}

export class NotificationCenterExamplePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    core.chrome.sidebar.registerApp({
      appId: notificationCenterAppId,
      // Notification state lives on core.notifications.events, not in a sidebar store.
      restoreOnReload: false,
      loadComponent: async () => {
        const [coreStart, startDeps] = await core.getStartServices();
        const { NotificationCenterApp } = await import('./notification_center_app');
        const events = coreStart.notifications.events;
        const activeSpaceId$: Observable<string> | undefined = startDeps.spaces
          ? startDeps.spaces.getActiveSpace$().pipe(map((s) => s.id))
          : undefined;
        const spacesEnabled = Boolean(startDeps.spaces);

        // Wrap the sidebar app's render so the hooks have a provider in scope.
        return function NotificationCenterAppWithProvider(props: SidebarComponentProps) {
          return (
            <NotificationEventsProvider value={events}>
              <NotificationCenterApp
                {...props}
                activeSpaceId$={activeSpaceId$ ?? of<string | undefined>(undefined)}
                spacesEnabled={spacesEnabled}
              />
            </NotificationEventsProvider>
          );
        };
      },
    });

    core.application.register({
      id: 'notificationCenterExample',
      title: 'Notification Center Example',
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const events = coreStart.notifications.events;

        // Idempotent: registering existing typeIds is a no-op in EventsService.
        registerDemoTypes(events);

        const { App } = await import('./app');

        ReactDOM.render(
          coreStart.rendering.addContext(
            <NotificationEventsProvider value={events}>
              <App />
            </NotificationEventsProvider>
          ),
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    deps.developerExamples.register({
      appId: 'notificationCenterExample',
      title: 'Notification Center',
      description:
        'Fully featured notification center demo built on core.notifications.events, the browser-hooks package, and the NotificationEvent component.',
    });
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
