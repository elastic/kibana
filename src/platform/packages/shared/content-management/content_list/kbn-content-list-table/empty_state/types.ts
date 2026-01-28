/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Base props shared by all empty state components.
 */
export interface BaseEmptyStateProps {
  /** Singular name of the entity type (e.g., "dashboard"). */
  entityName: string;
  /** Plural name of the entity type (e.g., "dashboards"). */
  entityNamePlural: string;
  /** Optional test subject for testing. */
  'data-test-subj'?: string;
}

/**
 * Props for {@link NoItemsEmptyState} component.
 */
export interface NoItemsEmptyStateProps extends BaseEmptyStateProps {
  /** Optional handler to create a new item. */
  onCreate?: () => void;
}

/**
 * Props for {@link NoResultsEmptyState} component.
 */
export interface NoResultsEmptyStateProps extends BaseEmptyStateProps {
  /** Optional handler to clear active filters. */
  onClearFilters?: () => void;
  /** Optional handler to clear the search query. */
  onClearSearch?: () => void;
  /** The current search query string. */
  searchQuery?: string;
  /** Number of active filters. */
  activeFiltersCount?: number;
  /** Whether any filters are currently active. */
  hasActiveFilters?: boolean;
  /** Whether a search query is currently active. */
  hasSearch?: boolean;
}

/**
 * Props for {@link ErrorEmptyState} component.
 */
export interface ErrorEmptyStateProps extends BaseEmptyStateProps {
  /** Optional handler to retry the failed operation. */
  onRetry?: () => void;
  /** The error object containing the error message. */
  error?: Error;
}
