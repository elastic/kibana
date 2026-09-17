/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';

/**
 * Plugin start contracts the workflows-ui components need but that core does not
 * provide, so they cannot be read from `useKibana()` reliably in every host
 * plugin. They are supplied explicitly through {@link WorkflowsUiServicesProvider}
 * instead of an implicit `useKibana().services` read, so a host plugin that
 * forgets to wire them fails loudly rather than silently rendering fallback
 * (e.g. missing connector / step / trigger icons).
 */
export interface WorkflowsUiServices {
  /** Step + trigger definition registry (icons, labels) populated at plugin start. */
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  /** Provides the `actionTypeRegistry` used to resolve connector (action type) icons. */
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const WorkflowsUiServicesContext = createContext<WorkflowsUiServices | null>(null);

export interface WorkflowsUiServicesProviderProps {
  services: WorkflowsUiServices;
  children: React.ReactNode;
}

/**
 * Provides the plugin services the workflows-ui components depend on. Any host
 * plugin rendering the workflows library components (e.g. `<CatalogBrowser>`)
 * must wrap them in this provider.
 */
export const WorkflowsUiServicesProvider = React.memo<WorkflowsUiServicesProviderProps>(
  ({ services, children }) => (
    <WorkflowsUiServicesContext.Provider value={services}>
      {children}
    </WorkflowsUiServicesContext.Provider>
  )
);
WorkflowsUiServicesProvider.displayName = 'WorkflowsUiServicesProvider';

/**
 * Returns the {@link WorkflowsUiServices}. Throws when used outside a
 * {@link WorkflowsUiServicesProvider} so a missing provider is a hard error
 * rather than a silent icon/behavior degradation.
 */
export function useWorkflowsUiServices(): WorkflowsUiServices {
  const services = useContext(WorkflowsUiServicesContext);
  if (!services) {
    throw new Error(
      'useWorkflowsUiServices must be used within a <WorkflowsUiServicesProvider>. ' +
        'Wrap the workflows-ui components in the provider and supply `workflowsExtensions` and `triggersActionsUi`.'
    );
  }
  return services;
}
