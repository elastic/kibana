/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, Fragment, isValidElement, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
import type { ParsedPart } from '@kbn/content-list-assembly';
import { useContentListSort } from '@kbn/content-list-provider';
import { filter } from '../filters/part';
import { Filters, type FiltersProps } from '../filters/filters';
import type { FilterContext } from '../filters/part';

/** Default filter when no children are provided. */
const DEFAULT_PARTS: ParsedPart[] = [
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
  if (filterChildren.length === 0) return DEFAULT_PARTS;

  const parts = filterChildren.flatMap((child) => filter.parseChildren(child));
  return parts.length > 0 ? parts : DEFAULT_PARTS;
};

/**
 * Hook to parse and build toolbar filters from declarative children.
 *
 * Encapsulates the full filter resolution flow:
 * 1. Extract `<Filters>` children from the toolbar's children.
 * 2. Parse declarative `Filter` presets via `filter.parseChildren`.
 * 3. Resolve `SearchFilterConfig` objects via `filter.resolve`.
 * 4. Fall back to default sort filter if none are found.
 *
 * @param children - React children from the toolbar component.
 * @returns Array of EUI search filter configs ready for `EuiSearchBar`.
 */
export const useFilters = (children: ReactNode): SearchFilterConfig[] => {
  const { isSupported: hasSorting } = useContentListSort();

  // Note: `children` is used as a memo dependency. React children are often
  // unstable references (new JSX objects each render), so this memo may
  // recompute more than expected. The parsing logic is cheap, so this is
  // acceptable today. If the filter set grows or resolution becomes expensive,
  // consider keying on a more stable signal.
  return useMemo(() => {
    const parts = parseFilterParts(children);
    const context: FilterContext = { hasSorting };

    return parts
      .map((part) => filter.resolve(part, context))
      .filter((f): f is SearchFilterConfig => f !== undefined);
  }, [children, hasSorting]);
};
