import React from 'react';
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
export interface WorkflowsUiServicesProviderProps {
    services: WorkflowsUiServices;
    children: React.ReactNode;
}
/**
 * Provides the plugin services the workflows-ui components depend on. Any host
 * plugin rendering the workflows library components (e.g. `<CatalogBrowser>`)
 * must wrap them in this provider.
 */
export declare const WorkflowsUiServicesProvider: React.NamedExoticComponent<WorkflowsUiServicesProviderProps>;
/**
 * Returns the {@link WorkflowsUiServices}. Throws when used outside a
 * {@link WorkflowsUiServicesProvider} so a missing provider is a hard error
 * rather than a silent icon/behavior degradation.
 */
export declare function useWorkflowsUiServices(): WorkflowsUiServices;
