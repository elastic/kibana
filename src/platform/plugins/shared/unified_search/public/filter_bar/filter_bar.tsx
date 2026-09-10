/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { IntlShape } from '@kbn/i18n-react';
import { injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { FilterItems, type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';
import type { IUnifiedSearchPluginServices } from '../types';
import { useFilterBarContext } from './filter_bar_context';

export interface Props {
  kibana: KibanaReactContextValue<IUnifiedSearchPluginServices>;
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className?: string;
  indexPatterns: DataView[];
  timeRangeForSuggestionsOverride?: boolean;
  intl: IntlShape;
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
  const themeContext = useEuiTheme();
  const styles = filterBarStyles(themeContext, props.afterQueryBar);

  const groupRef = useRef<HTMLDivElement>(null);

  const { isCollapsed, isCollapsible, expandablePillsId } = useFilterBarContext();

  if (!isCollapsible) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems={!isCollapsed ? 'flexStart' : 'center'}
      gutterSize="xs"
      wrap={!isCollapsed}
      responsive={false}
    >
      <EuiFlexItem
        id={expandablePillsId}
        aria-hidden={isCollapsed}
        grow={true}
        css={[styles.pillsScrollContainer, isCollapsed ? styles.filterBarContentCollapsed : null]}
      >
        <EuiFlexGroup
          css={styles.filterPillGroup}
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(withKibana(FilterBarUI));
