/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { HousekeepingPage } from './components';
import type { HousekeepingService } from './housekeeping_service';

const App = ({ service }: { service: HousekeepingService }) => {
  const { state, rerun } = service.useFindings();
  return (
    <service.LinksProvider>
      <HousekeepingPage state={state} onRerun={rerun} />
      {service.EmbeddableConsole && <service.EmbeddableConsole />}
    </service.LinksProvider>
  );
};

export const renderApp = (
  { element, setBreadcrumbs }: ManagementAppMountParams,
  {
    coreStart,
    service,
    title,
  }: { coreStart: CoreStart; service: HousekeepingService; title: string }
) => {
  setBreadcrumbs([{ text: title }]);
  const root = createRoot(element);
  root.render(
    <KibanaRenderContextProvider {...coreStart}>
      <App service={service} />
    </KibanaRenderContextProvider>
  );
  return () => {
    root.unmount();
  };
};
