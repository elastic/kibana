import React from 'react';
import type { Template } from '@kbn/workflows-library';
export interface CatalogBrowserProps {
    onSelect: (template: Template) => void;
}
/**
 * The Workflow Template Library catalog: category facets, free-text search, a
 * solution filter (pre-selected and locked when a solution-scoped nav context
 * is active), and a card grid. Renders in any plugin — only depends on core
 * services (http via `useWorkflowsApi`, chrome via `useActiveSolution`).
 */
export declare const CatalogBrowser: React.NamedExoticComponent<CatalogBrowserProps>;
