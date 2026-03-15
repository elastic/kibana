/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import type { IntlShape } from '@kbn/i18n-react';
import { injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import type { ReactNode } from 'react';
import React, { useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import { i18n } from '@kbn/i18n';
import { FilterItems, type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';

export interface Props {
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
  const { euiTheme } = themeContext;
  const styles = filterBarStyles({ euiTheme }, props.afterQueryBar);
  const { fontSize } = euiFontSize(themeContext, 's');
  const groupRef = useRef<HTMLDivElement>(null);
  const filterCount = props.filters?.length ?? 0;
  const [isExpanded, setIsExpanded] = useState(false);

  const renderFilterPills = (groupCss = styles.group) => (
    <EuiFlexGroup
      css={groupCss}
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

  const filterPillsContent = renderFilterPills();

  if (filterCount === 0) {
    return filterPillsContent;
  }

  const collapseLabel = i18n.translate(
    'unifiedSearch.filter.filterBar.collapseFiltersButtonLabel',
    { defaultMessage: 'Collapse filters' }
  );
  const expandLabel = i18n.translate(
    'unifiedSearch.filter.filterBar.expandFiltersButtonLabel',
    { defaultMessage: 'Expand filters' }
  );
  const filtersAppliedLabel = i18n.translate(
    'unifiedSearch.filter.filterBar.filtersAppliedAccordionButton',
    {
      defaultMessage: '{count, plural, one {# filter applied} other {# filters applied}}',
      values: { count: filterCount },
    }
  );

  if (isExpanded) {
    return (
      <EuiFlexGroup
        css={[styles.group, css({ marginTop: props.afterQueryBar ? euiTheme.size.s : 0 })]}
        alignItems="flexStart"
        gutterSize="xs"
        wrap={true}
        responsive={false}
        data-test-subj="filter-bar-accordion"
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowDown"
            aria-label={collapseLabel}
            onClick={() => setIsExpanded(false)}
            data-test-subj="filter-bar-collapse"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true} css={[css({ minWidth: 0 }), styles.pillsScrollContainer]}>
          {renderFilterPills(styles.groupWithoutMargin)}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      css={[styles.group, css({ marginTop: props.afterQueryBar ? euiTheme.size.s : 0 })]}
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      data-test-subj="filter-bar-accordion"
    >
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="arrowRight"
          aria-label={expandLabel}
          onClick={() => setIsExpanded(true)}
          data-test-subj="filter-bar-expand"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          css={css({
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize,
            color: euiTheme.colors.text,
          })}
          data-test-subj="filter-bar-toggle"
        >
          {filtersAppliedLabel}
        </button>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(FilterBarUI);
