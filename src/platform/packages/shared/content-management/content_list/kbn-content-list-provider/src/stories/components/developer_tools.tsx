/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiCodeBlock,
  EuiText,
  EuiTabbedContent,
  type EuiTabbedContentTab,
} from '@elastic/eui';
import {
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
  useContentListSort,
  useContentListPagination,
  useContentListSelection,
  useContentListConfig,
  type ContentListFeatures,
} from '../..';

/**
 * Displays the current runtime state of the provider as JSON.
 * Useful for debugging and understanding how state changes.
 */
const RuntimeStateDisplay: React.FC = () => {
  const { items, totalItems, isLoading, error } = useContentListItems();
  const { queryText, error: searchError } = useContentListSearch();
  const { filters } = useContentListFilters();
  const { field: sortField, direction: sortDirection } = useContentListSort();
  const { index: pageIndex, size: pageSize } = useContentListPagination();
  const { getSelectedItems } = useContentListSelection();

  const displayState = {
    isLoading,
    error: error?.message,
    search: { queryText, error: searchError?.message },
    filters,
    sort: { field: sortField, direction: sortDirection },
    page: { index: pageIndex, size: pageSize },
    selectedItems: getSelectedItems().map((item) => item.id),
    totalItems,
    items: items.map((item) => ({ id: item.id, title: item.title })),
  };

  return (
    <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable overflowHeight={500}>
      {JSON.stringify(displayState, null, 2)}
    </EuiCodeBlock>
  );
};

/**
 * Displays how the search query is parsed into structured filters.
 * Demonstrates the query syntax feature.
 */
const QueryParsingDisplay: React.FC = () => {
  const { queryText } = useContentListSearch();
  const { filters } = useContentListFilters();
  const config = useContentListConfig();

  const parsingResult = {
    input: queryText || '(empty)',
    parsed: {
      tags: filters.tags ?? null,
      starredOnly: filters.starredOnly ?? false,
      users: filters.users ?? null,
      cleanSearchQuery: filters.search ?? null,
    },
  };

  const hasTags = config.supports.tags;
  const hasStarred = config.supports.starred;

  return (
    <>
      <EuiText size="xs" color="subdued">
        <p>
          <strong>Query syntax</strong> (switch to <strong>Full</strong> preset for all features):
        </p>
        <ul>
          <li style={{ opacity: hasTags ? 1 : 0.5 }}>
            <code>tag:Production</code> — filter by tag name {!hasTags && '(requires Full preset)'}
          </li>
          <li style={{ opacity: hasTags ? 1 : 0.5 }}>
            <code>-tag:Archived</code> — exclude a tag {!hasTags && '(requires Full preset)'}
          </li>
          <li style={{ opacity: hasStarred ? 1 : 0.5 }}>
            <code>is:starred</code> — show only starred items{' '}
            {!hasStarred && '(requires Full preset)'}
          </li>
          <li>
            <code>createdBy:elastic</code> — filter by creator
          </li>
        </ul>
        {hasTags && (
          <p>
            <strong>Available tags:</strong> Important, Production, Development, Archived, Security
          </p>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="json" fontSize="s" paddingSize="m" isCopyable overflowHeight={300}>
        {JSON.stringify(parsingResult, null, 2)}
      </EuiCodeBlock>
    </>
  );
};

/** Formats features config as JSX-like string for display. */
const formatFeatures = (features?: ContentListFeatures): string => {
  if (!features || Object.keys(features).length === 0) {
    return '';
  }

  // Filter out functions and format as readable object.
  const filtered = Object.fromEntries(
    Object.entries(features).filter(([, v]) => typeof v !== 'function' && typeof v !== 'object')
  );
  const objects = Object.entries(features)
    .filter(([, v]) => typeof v === 'object' && v !== null)
    .map(([k, v]) => `    ${k}: ${JSON.stringify(v, null, 2).replace(/\n/g, '\n    ')}`);

  const booleans = Object.entries(filtered).map(([k, v]) => `    ${k}: ${v}`);
  const all = [...booleans, ...objects].join(',\n');
  return all ? `  features={{\n${all},\n  }}` : '';
};

export interface PresetConfig {
  label: string;
  description: string;
  features?: ContentListFeatures;
  isReadOnly: boolean;
}

/** Generates provider JSX code for display. */
const getProviderSourceCode = (preset: PresetConfig, entityName: string): string => {
  const lines = [
    `  entityName="${entityName}"`,
    `  entityNamePlural="${entityName}s"`,
    preset.isReadOnly ? '  isReadOnly={true}' : null,
    '  dataSource={{ findItems, transform }}',
    '  services={myServices}',
    formatFeatures(preset.features) || null,
  ].filter(Boolean);

  return `<ContentListProvider\n${lines.join('\n')}\n>\n  {children}\n</ContentListProvider>`;
};

export interface DeveloperToolsProps {
  preset: PresetConfig;
  entityName: string;
}

/**
 * Developer tools panel for the Storybook demo.
 * Shows configuration code, query syntax help, and live state.
 */
export const DeveloperTools: React.FC<DeveloperToolsProps> = ({ preset, entityName }) => {
  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'config',
      name: 'Config',
      content: (
        <>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="tsx" fontSize="s" paddingSize="m" isCopyable overflowHeight={500}>
            {getProviderSourceCode(preset, entityName)}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'query',
      name: 'Query Syntax',
      content: (
        <>
          <EuiSpacer size="s" />
          <QueryParsingDisplay />
        </>
      ),
    },
    {
      id: 'state',
      name: 'State',
      content: (
        <>
          <EuiSpacer size="s" />
          <RuntimeStateDisplay />
        </>
      ),
    },
  ];

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiTitle size="xs">
        <h3>Developer Tools</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>Inspect provider configuration and live state.</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />
    </EuiPanel>
  );
};
