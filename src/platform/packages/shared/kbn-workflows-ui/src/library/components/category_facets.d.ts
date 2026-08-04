import React from 'react';
import type { Template } from '@kbn/workflows-library';
export interface CategoryFacetsProps {
    /**
     * The catalog scoped by every filter except category (search, solution) — used
     * to compute facet counts so a category's own selection doesn't collapse its count.
     */
    templates: Template[];
    selectedCategories: string[];
    onChange: (categories: string[]) => void;
}
/**
 * Facet sidebar over the closed-vocabulary `categories` field. Labels humanize
 * the kebab-case category id (e.g. `threat-intel` → `Threat Intel`).
 *
 * Selection is single-select like the Integrations catalog: clicking a
 * category shows only that category; "All categories" resets. The prop shape
 * stays `string[]` so hosts don't churn, but at most one entry is emitted.
 */
export declare const CategoryFacets: React.NamedExoticComponent<CategoryFacetsProps>;
