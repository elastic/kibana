/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, Fragment, createElement, isValidElement, useCallback, useMemo } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { Query, SearchFilterConfig } from '@elastic/eui';
import type { ParsedPart } from '@kbn/content-list-assembly';
import {
  useContentListSort,
  useContentListConfig,
  useContentListSearch,
} from '@kbn/content-list-provider';
import { filter } from '../filters/part';
import { Filters, type FiltersProps } from '../filters/filters';
import type { FilterContext } from '../filters/part';

/**
 * Structural shape of the props `EuiSearchBar` passes to a `custom_component`
 * filter.
 *
 * Mirrors `CustomComponentProps` from
 * `@elastic/eui/src/components/search_bar/filters/custom_component_filter`,
 * but defined locally so we don't deep-import EUI internals. EUI's
 * `CustomComponentFilter` only forwards `query` and `onChange` to the wrapped
 * component, so this type stays in sync as long as those two props are passed.
 */
interface CustomFilterComponentProps {
  query: Query;
  onChange?: (query: Query) => void;
}

// Default order: starred toggle → tag facet → created by → sort.
// Each resolves to undefined when its corresponding service/feature is absent,
// so unused entries are silently dropped.
const DEFAULT_PARTS: ParsedPart[] = [
  { type: 'part', part: 'filter', preset: 'starred', instanceId: 'starred', attributes: {} },
  { type: 'part', part: 'filter', preset: 'tags', instanceId: 'tags', attributes: {} },
  { type: 'part', part: 'filter', preset: 'createdBy', instanceId: 'createdBy', attributes: {} },
  { type: 'part', part: 'filter', preset: 'sort', instanceId: 'sort', attributes: {} },
];

/**
 * Extract `<Filters>` containers from direct children and fragment-wrapped children.
 */
const extractFilterChildren = (children: ReactNode): ReactNode[] => {
  const extractedChildren: ReactNode[] = [];

  const walk = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) {
        return;
      }

      if (child.type === Fragment) {
        walk(child.props.children);
        return;
      }

      if (child.type === Filters) {
        extractedChildren.push((child as ReactElement<FiltersProps>).props.children);
      }
    });
  };

  walk(children);
  return extractedChildren;
};

/**
 * Parse filter parts from children, falling back to defaults.
 *
 * Extracts the inner `<Filters>` children from the toolbar's children,
 * then uses `filter.parseChildren` to find filter presets.
 */
const parseFilterParts = (children: ReactNode): ParsedPart[] => {
  const filterChildren = extractFilterChildren(children);
  if (filterChildren.length === 0) {
    return DEFAULT_PARTS;
  }

  const parts = filterChildren.flatMap((child) => filter.parseChildren(child));
  return parts.length > 0 ? parts : DEFAULT_PARTS;
};

/**
 * Cache of marked filter component wrappers, keyed by the underlying
 * `Component`.
 *
 * `EuiSearchBar` reconciles its filters by React element type. Returning a
 * fresh wrapper component on every memo recomputation would unmount and
 * remount each custom filter (popover state, focus, debounce timers, in-flight
 * facet queries, ...) any time the toolbar's `children` reference flips —
 * which `useFilters` already documents as common. The cache keeps the wrapper
 * identity stable as long as `Component` is stable.
 *
 * `WeakMap` keys are weakly held, so wrappers are garbage-collected once the
 * underlying `Component` becomes unreachable.
 *
 * TODO(https://github.com/elastic/eui/issues/9647): drop this cache and the
 * wrapping entirely once `EuiSearchBar` surfaces a change source on its
 * top-level `onChange` (typing vs custom-filter), so the toolbar can branch
 * directly in `handleSearchChange` without intercepting per-component.
 */
const wrapperCache = new WeakMap<
  ComponentType<CustomFilterComponentProps>,
  ComponentType<CustomFilterComponentProps>
>();

const getWrappedFilterComponent = (
  Component: ComponentType<CustomFilterComponentProps>
): ComponentType<CustomFilterComponentProps> => {
  const cached = wrapperCache.get(Component);
  if (cached) {
    return cached;
  }

  // The wrapper dispatches `SET_QUERY` with `source: 'filter'` directly from
  // the wrapped `onChange`, instead of forwarding to EUI's `onChange`.
  //
  // The forward path would re-route the change through
  // `EuiSearchBar.notifyControllingParent` and back into our
  // `handleSearchChange`, which would dispatch with the default `'typing'`
  // source and overwrite the `'filter'` tag. By bypassing it we keep the
  // intent local to the dispatch and let the controlled `query` prop drive
  // EuiSearchBar's reconciliation via `getDerivedStateFromProps`.
  const Wrapped = (props: CustomFilterComponentProps): JSX.Element => {
    const { setQueryFromEuiQuery } = useContentListSearch();
    const handleChange = useCallback(
      (nextQuery: Query) => setQueryFromEuiQuery(nextQuery, 'filter'),
      [setQueryFromEuiQuery]
    );

    return createElement(Component, { ...props, onChange: handleChange });
  };
  Wrapped.displayName = `WrappedCustomFilter(${
    Component.displayName ?? Component.name ?? 'Anonymous'
  })`;

  wrapperCache.set(Component, Wrapped);
  return Wrapped;
};

// Track which non-`custom_component` filter types we've already warned about
// so the dev-mode warning fires once per type per process, not once per
// render.
const warnedNonCustomFilterTypes = new Set<string>();

const warnNonCustomFilterType = (filterType: string): void => {
  if (process.env.NODE_ENV === 'production' || warnedNonCustomFilterTypes.has(filterType)) {
    return;
  }
  warnedNonCustomFilterTypes.add(filterType);
  // eslint-disable-next-line no-console
  console.warn(
    `[ContentListToolbar] Filter type "${filterType}" cannot be wrapped for URL sync. ` +
      `Changes from this filter route through \`EuiSearchBar\` and will be tagged as ` +
      `\`'typing'\`, so the URL will use \`history.replace\` instead of \`history.push\`. ` +
      `Use \`type: 'custom_component'\` for filters that should commit a new history entry.`
  );
};

const wrapCustomFilters = (filters: SearchFilterConfig[]): SearchFilterConfig[] =>
  filters.map((config) => {
    if (config.type !== 'custom_component') {
      // All built-in `ContentList` filter resolvers return `custom_component`
      // configs today; warn loudly when a third-party resolver returns a
      // different type so we surface the URL-history degradation early.
      warnNonCustomFilterType(config.type);
      return config;
    }

    return {
      ...config,
      component: getWrappedFilterComponent(config.component),
    };
  });

/**
 * Hook to parse and build toolbar filters from declarative children.
 *
 * Encapsulates the full filter resolution flow:
 * 1. Extract `<Filters>` children from the toolbar's children.
 * 2. Parse declarative `Filter` presets via `filter.parseChildren`.
 * 3. Resolve `SearchFilterConfig` objects via `filter.resolve`.
 * 4. Fall back to default filters (tags + sort) if none are found.
 *
 * Each `custom_component` filter is wrapped so its `onChange` dispatches
 * `SET_QUERY` with `source: 'filter'` directly. URL sync reads
 * `state.queryChangeSource` to decide between `history.push` and
 * `history.replace`; see {@link ContentListUrlSync}.
 *
 * @param children - React children from the toolbar component.
 * @returns Array of EUI search filter configs ready for `EuiSearchBar`.
 */
export const useFilters = (children: ReactNode): SearchFilterConfig[] => {
  const { isSupported: hasSorting } = useContentListSort();
  const { supports } = useContentListConfig();
  const { tags: hasTags, starred: hasStarred, userProfiles: hasCreatedBy } = supports;

  // Note: `children` is used as a memo dependency. React children are often
  // unstable references (new JSX objects each render), so this memo may
  // recompute more than expected. The parsing logic is cheap, so this is
  // acceptable today. Wrapped filter component identity is stabilized inside
  // `wrapCustomFilters` via `wrapperCache`, so these recomputes do not
  // remount custom filter components.
  return useMemo(() => {
    const parts = parseFilterParts(children);
    const context: FilterContext = { hasSorting, hasTags, hasStarred, hasCreatedBy };

    const resolvedFilters = parts
      .map((part) => filter.resolve(part, context))
      .filter((f): f is SearchFilterConfig => f !== undefined);

    return wrapCustomFilters(resolvedFilters);
  }, [children, hasSorting, hasTags, hasStarred, hasCreatedBy]);
};
