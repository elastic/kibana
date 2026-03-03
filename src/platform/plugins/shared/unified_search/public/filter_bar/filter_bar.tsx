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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IntlShape } from '@kbn/i18n-react';
import { injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import type { ReactNode } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import { i18n } from '@kbn/i18n';
import { FilterItems, type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';

const collapseLabel = i18n.translate('unifiedSearch.filter.filterBar.collapseFiltersButtonLabel', {
  defaultMessage: 'Collapse filters',
});
const expandLabel = i18n.translate('unifiedSearch.filter.filterBar.expandFiltersButtonLabel', {
  defaultMessage: 'Expand filters',
});

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
  const styles = filterBarStyles(themeContext, props.afterQueryBar);
  const { euiTheme } = themeContext;

  const groupRef = useRef<HTMLDivElement>(null);

  const filterCount = props.filters?.length ?? 0;
  const isExpandable = filterCount > 1;
  const expandTooltipRef = useRef<EuiToolTip>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const expandablePillsId = useGeneratedHtmlId();

  const filterPills = (
    <EuiFlexGroup
      css={isExpandable ? styles.groupWithoutMargin : styles.group}
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

  const onToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    // Hide the expand button tooltip on click so that it doesn't block the new content
    expandTooltipRef.current?.hideToolTip();
  }, [isExpanded]);

  if (!isExpandable) {
    return filterPills;
  }
  const filtersAppliedLabel = i18n.translate(
    'unifiedSearch.filter.filterBar.filtersAppliedAccordionButton',
    {
      defaultMessage: '{count} filters applied',
      values: { count: filterCount },
    }
  );

  return (
    <EuiFlexGroup
      css={[styles.group, css({ marginTop: props.afterQueryBar ? euiTheme.size.s : 0 })]}
      alignItems={isExpanded ? 'flexStart' : 'center'}
      gutterSize="xs"
      wrap={isExpanded}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip
          ref={expandTooltipRef}
          content={isExpanded ? collapseLabel : expandLabel}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            css={isExpanded ? css({ marginTop: euiTheme.size.xs }) : null}
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-label={isExpanded ? collapseLabel : expandLabel}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-controls={expandablePillsId}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {/* For a11y compliance, show and hide filtersAppliedLabel and filterPills using CSS instead of re-renders */}
      <EuiFlexItem
        css={isExpanded ? css({ display: 'none' }) : null}
        aria-hidden={isExpanded}
        grow={false}
      >
        <EuiButtonEmpty
          flush="left"
          type="button"
          onClick={onToggleExpand}
          color="text"
          aria-expanded={isExpanded}
        >
          {filtersAppliedLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem
        id={expandablePillsId}
        aria-hidden={!isExpanded}
        grow={true}
        css={[
          css({ minWidth: 0 }),
          styles.pillsScrollContainer,
          !isExpanded ? css({ blockSize: 0 }) : null,
        ]}
      >
        {filterPills}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(FilterBarUI);
