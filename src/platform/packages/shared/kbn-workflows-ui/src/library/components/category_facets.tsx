/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFacetButton, EuiFacetGroup } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
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

function humanizeCategoryId(id: string): string {
  return id
    .split('-')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Facet sidebar over the closed-vocabulary `categories` field. Labels humanize
 * the kebab-case category id (e.g. `threat-intel` → `Threat Intel`);
 */
export const CategoryFacets = React.memo<CategoryFacetsProps>(
  ({ templates, selectedCategories, onChange }) => {
    const categoryCounts = useMemo(() => {
      const counts = new Map<string, number>();
      for (const template of templates) {
        for (const category of template.categories) {
          counts.set(category, (counts.get(category) ?? 0) + 1);
        }
      }
      return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [templates]);

    const toggleCategory = useCallback(
      (id: string) => {
        if (selectedCategories.includes(id)) {
          onChange(selectedCategories.filter((category) => category !== id));
        } else {
          onChange([...selectedCategories, id]);
        }
      },
      [selectedCategories, onChange]
    );

    const clearCategories = useCallback(() => onChange([]), [onChange]);

    return (
      <nav
        aria-label={i18n.translate('workflows.library.categoryFacets.ariaLabel', {
          defaultMessage: 'Filter templates by category',
        })}
      >
        <EuiFacetGroup>
          <EuiFacetButton
            quantity={templates.length}
            isSelected={selectedCategories.length === 0}
            onClick={clearCategories}
            data-test-subj="workflowLibraryCategoryFacet-all"
          >
            {i18n.translate('workflows.library.categoryFacets.allCategories', {
              defaultMessage: 'All categories',
            })}
          </EuiFacetButton>
          {categoryCounts.map(([id, count]) => (
            <EuiFacetButton
              key={id}
              quantity={count}
              isSelected={selectedCategories.includes(id)}
              onClick={() => toggleCategory(id)}
              data-test-subj={`workflowLibraryCategoryFacet-${id}`}
            >
              {humanizeCategoryId(id)}
            </EuiFacetButton>
          ))}
        </EuiFacetGroup>
      </nav>
    );
  }
);
CategoryFacets.displayName = 'CategoryFacets';
