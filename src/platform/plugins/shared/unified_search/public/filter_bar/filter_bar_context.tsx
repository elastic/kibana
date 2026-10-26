/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const FILTER_BAR_COLLAPSED_SETTING = 'kibana.unifiedSearch.filterBarCollapsed';

const FilterBarContext = createContext<{
  isCollapsible: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  expandablePillsId: string;
  numActiveFilters: number;
}>({
  isCollapsible: false,
  isCollapsed: false,
  onToggleCollapse: () => {},
  expandablePillsId: '',
  numActiveFilters: 0,
});

export const FilterBarContextProvider: React.FC<
  React.PropsWithChildren<{
    filters?: Filter[];
    storage: IStorageWrapper;
  }>
> = ({ filters, storage, children }) => {
  const numFilters = filters?.length ?? 0;
  const numDisabledFilters = useMemo(
    () => filters?.filter(({ meta: { disabled } }) => disabled).length ?? 0,
    [filters]
  );
  const numActiveFilters = useMemo(
    () => numFilters - numDisabledFilters,
    [numDisabledFilters, numFilters]
  );
  const isCollapsible = useMemo(() => numFilters > 0, [numFilters]);
  const expandablePillsId = useGeneratedHtmlId();

  /** isCollapsed initial state should be as follows:
   * - Expanded by default
   * - Pull from localStorage ONLY if the filter bar is initially collapsible
   *   (If the user has not yet added at least 1 filter, we never want to immediately collapse
   *    the filter bar the moment they add enough filters to make it collapsible. It should only
   *    collapse in response to the user manually closing it. If the user then refreshes the page,
   *    localStorage may initialize the filter bar as collapsed, which is acceptable)
   */
  const [isCollapsed, setIsCollapsed] = useState(
    isCollapsible ? Boolean(storage.get(FILTER_BAR_COLLAPSED_SETTING)) : false
  );
  const onToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
    storage.set(FILTER_BAR_COLLAPSED_SETTING, !isCollapsed);
  }, [isCollapsed, storage]);

  useEffect(() => {
    // If, while the filter bar is collapsed, the user clears all filters, reset isCollapsed to false
    // This prevents the filter bar from staying collapsed if the user then adds another filter without refreshing
    // The filter bar must ALWAYS render expanded if the number of filters goes from 0 to 1
    if (!isCollapsible && isCollapsed) setIsCollapsed(false);
  }, [isCollapsed, isCollapsible]);

  return (
    <FilterBarContext.Provider
      value={{
        isCollapsible,
        isCollapsed,
        onToggleCollapse,
        expandablePillsId,
        numActiveFilters,
      }}
    >
      {children}
    </FilterBarContext.Provider>
  );
};

export const useFilterBarContext = () => useContext(FilterBarContext);
