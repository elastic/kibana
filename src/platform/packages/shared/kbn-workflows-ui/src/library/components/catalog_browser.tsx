/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { CategoryFacets } from './category_facets';
import { SolutionFilter } from './solution_filter';
import { TemplateCard } from './template_card';
import { filterCatalog } from '../hooks/filter_catalog';
import { useActiveSolution } from '../hooks/use_active_solution';
import { useCatalog } from '../hooks/use_catalog';

export interface CatalogBrowserProps {
  onSelect: (template: Template) => void;
}

interface CenteredMessageProps {
  children: React.ReactNode;
  dataTestSubj: string;
}

const CenteredMessage = React.memo<CenteredMessageProps>(({ children, dataTestSubj }) => (
  <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 240 }}>
    <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
      {children}
    </EuiFlexItem>
  </EuiFlexGroup>
));
CenteredMessage.displayName = 'CenteredMessage';

/**
 * The Workflow Template Library catalog: category facets, free-text search, a
 * solution filter (pre-selected and locked when a solution-scoped nav context
 * is active), and a card grid. Renders in any plugin — only depends on core
 * services (http via `useWorkflowsApi`, chrome via `useActiveSolution`).
 */
export const CatalogBrowser = React.memo<CatalogBrowserProps>(({ onSelect }) => {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [manualSolution, setManualSolution] = useState<string | undefined>(undefined);

  const activeSolution = useActiveSolution();
  const solution = activeSolution ?? manualSolution;

  const { templates, allTemplates, isLoading, isError, refetch } = useCatalog({
    search,
    categories: selectedCategories,
    solution,
  });

  // Scoped by search + solution but not categories, so category facet counts stay
  // meaningful (a category's own count isn't collapsed by its own selection) while
  // still reflecting the solution lock and search term a host may apply.
  const facetScopedTemplates = useMemo(
    () => filterCatalog(allTemplates, { search, solution }),
    [allTemplates, search, solution]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
    []
  );
  const handleRetry = useCallback(() => refetch(), [refetch]);

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <CenteredMessage dataTestSubj="workflowLibraryLoading">
        <EuiLoadingSpinner size="xl" />
      </CenteredMessage>
    );
  } else if (isError) {
    content = (
      <EuiCallOut
        data-test-subj="workflowLibraryError"
        announceOnMount
        color="danger"
        iconType="warning"
        title={i18n.translate('workflows.library.error.title', {
          defaultMessage: 'Unable to load the template library',
        })}
      >
        <EuiButton onClick={handleRetry} color="danger" data-test-subj="workflowLibraryRetryButton">
          {i18n.translate('workflows.library.error.retry', { defaultMessage: 'Retry' })}
        </EuiButton>
      </EuiCallOut>
    );
  } else if (allTemplates.length === 0) {
    content = (
      <CenteredMessage dataTestSubj="workflowLibraryEmptyCatalog">
        <EuiText color="subdued">
          {i18n.translate('workflows.library.emptyCatalog', {
            defaultMessage: 'No templates are available for this Kibana version yet.',
          })}
        </EuiText>
      </CenteredMessage>
    );
  } else if (templates.length === 0) {
    content = (
      <CenteredMessage dataTestSubj="workflowLibraryNoMatches">
        <EuiText color="subdued">
          {i18n.translate('workflows.library.noMatches', {
            defaultMessage: 'No templates match the current filters.',
          })}
        </EuiText>
      </CenteredMessage>
    );
  } else {
    content = (
      <EuiFlexGrid columns={3} gutterSize="l" data-test-subj="workflowLibraryCatalogGrid">
        {templates.map((template) => (
          <EuiFlexItem key={template.slug}>
            <TemplateCard template={template} onSelect={onSelect} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }

  return (
    <EuiFlexGroup gutterSize="l" direction="column">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.translate('workflows.library.searchPlaceholder', {
                defaultMessage: 'Search templates',
              })}
              value={search}
              onChange={handleSearchChange}
              data-test-subj="workflowLibrarySearchField"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SolutionFilter
              templates={allTemplates}
              value={solution}
              onChange={setManualSolution}
              disabled={Boolean(activeSolution)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup
          data-test-subj="workflowLibraryCatalogBrowser"
          alignItems="flexStart"
          gutterSize="xl"
        >
          <EuiFlexItem grow={1}>
            <CategoryFacets
              templates={facetScopedTemplates}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={4}>{content}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CatalogBrowser.displayName = 'CatalogBrowser';
