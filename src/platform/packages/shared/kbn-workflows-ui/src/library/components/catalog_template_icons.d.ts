import React from 'react';
export interface CatalogTemplateIconsProps {
    stepTypes: string[];
    triggerTypes: string[];
}
/**
 * Renders the trigger + step icon row on a template card, from the catalog
 * row's `stepTypes` / `triggerTypes` string arrays (`@kbn/workflows-library`
 * `TemplateSchema`). Step types are deduped by base connector type so e.g.
 * `elasticsearch.search` and `elasticsearch.index` render a single icon.
 */
export declare const CatalogTemplateIcons: React.NamedExoticComponent<CatalogTemplateIconsProps>;
