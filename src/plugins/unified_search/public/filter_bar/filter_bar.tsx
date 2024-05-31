/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import React, { ReactNode, useRef } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import FilterItems, { type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';
import { SuggestionsAbstraction } from '../typeahead/suggestions_component';

export interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className?: string;
  indexPatterns: DataView[];
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  hiddenPanelOptions?: FilterItemsProps['hiddenPanelOptions'];
  /**
   * Applies extra styles necessary when coupled with the query bar
   */
  afterQueryBar?: boolean;
  /**
   * Disable all interactive actions
   */
  isDisabled?: boolean;
  /**
   * Prepends custom filter controls to the search bar
   */
  prepend?: ReactNode;
  /** Array of suggestion abstraction that controls the render of the field */
  suggestionsAbstraction?: SuggestionsAbstraction;
}

const FilterBarUI = React.memo(function FilterBarUI(props: Props) {
  const euiTheme = useEuiTheme();
  const styles = filterBarStyles(euiTheme, props.afterQueryBar);
  const groupRef = useRef<HTMLDivElement>(null);

  return (
    <EuiFlexGroup
      css={styles.group}
      ref={groupRef}
      wrap={true}
      responsive={false}
      gutterSize="none" // We use `gap` in the styles instead for better truncation of badges
      alignItems="center"
      tabIndex={-1}
      data-test-subj="filter-items-group"
      className={`filter-items-group ${props.className ?? ''}`}
    >
      {props.prepend}
      <FilterItems
        filters={props.filters!}
        onFiltersUpdated={props.onFiltersUpdated}
        indexPatterns={props.indexPatterns!}
        timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
        filtersForSuggestions={props.filtersForSuggestions}
        hiddenPanelOptions={props.hiddenPanelOptions}
        readOnly={props.isDisabled}
        suggestionsAbstraction={props.suggestionsAbstraction}
      />
    </EuiFlexGroup>
  );
});

const FilterBar = injectI18n(FilterBarUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBar;
