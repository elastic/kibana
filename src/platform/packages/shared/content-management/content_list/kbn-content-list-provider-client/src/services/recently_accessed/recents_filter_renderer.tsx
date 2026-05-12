/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFilterButton, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RecentlyAccessedHistorySource } from './types';

export const RECENT_FIELD = 'recent';

const defaultLabel = i18n.translate(
  'contentManagement.contentListProviderClient.recentlyAccessed.recentsFilter.label',
  { defaultMessage: 'Recent' }
);

/**
 * Props for {@link RecentsFilterRenderer}.
 *
 * `EuiSearchBar`'s `custom_component` filters receive `query` and `onChange`.
 * The toolbar's `filter.createComponent` does not forward declarative
 * attributes, so the recently-accessed source and label are bound via
 * closure when the renderer is registered (see
 * {@link useRecentlyAccessedDecoration}).
 */
export interface RecentsFilterRendererProps {
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /**
   * Recently-accessed source to read from. The renderer reads `.get()`
   * synchronously to determine whether to show itself.
   */
  service: RecentlyAccessedHistorySource;
  /** Optional label override. Defaults to "Recent". */
  label?: string;
  /** Optional `data-test-subj`. */
  'data-test-subj'?: string;
}

/**
 * Renders an `EuiFilterButton` that toggles `is:recent` in the
 * `EuiSearchBar` query — visible only when the recently-accessed source has
 * at least one entry.
 *
 * The companion `useRecentlyAccessedDecoration` hook builds a
 * `filter.createComponent`-wrapped form of this renderer, so consumers
 * normally do not import this directly.
 */
export const RecentsFilterRenderer = ({
  query,
  onChange,
  service,
  label = defaultLabel,
  'data-test-subj': dataTestSubj = 'contentListRecentsRenderer',
}: RecentsFilterRendererProps) => {
  const active = query?.hasIsClause(RECENT_FIELD) ?? false;

  const handleClick = useCallback(() => {
    if (!query || !onChange) {
      return;
    }

    const nextQuery = active
      ? query.removeIsClause(RECENT_FIELD)
      : query.addMustIsClause(RECENT_FIELD);

    onChange(nextQuery);
  }, [active, onChange, query]);

  // Synchronous read — the source is local-storage backed and the renderer
  // re-mounts each time the toolbar renders. Mirrors the legacy
  // `hasRecentlyAccessedMetadata` heuristic from `TableListView`.
  if (service.get().length === 0) {
    return null;
  }

  // Uses EUI's "single filter" pattern (`isToggle` + `isSelected`) so the
  // button renders with `aria-pressed={active}` semantics and the proper
  // toggled visual state. `hasActiveFilters` adds EUI's existing
  // active-highlight on top, matching the treatment used by the starred
  // filter so both single-filter toggles look and behave the same way.
  return (
    <EuiFilterButton
      isToggle
      isSelected={active}
      hasActiveFilters={active}
      iconType="clockCounter"
      onClick={handleClick}
      data-test-subj={dataTestSubj}
    >
      {label}
    </EuiFilterButton>
  );
};
