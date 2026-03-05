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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import { i18n } from '@kbn/i18n';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { FilterItems, type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';
import type { IUnifiedSearchPluginServices } from '../types';

const collapseLabel = i18n.translate('unifiedSearch.filter.filterBar.collapseFiltersButtonLabel', {
  defaultMessage: 'Collapse filters',
});
const expandLabel = i18n.translate('unifiedSearch.filter.filterBar.expandFiltersButtonLabel', {
  defaultMessage: 'Expand filters',
});

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

const FILTER_BAR_COLLAPSED_SETTING = 'kibana.unifiedSearch.filterBarCollapsed';

const FilterBarUI = React.memo(function FilterBarUI(props: Props) {
  const { storage } = props.kibana.services;
  const themeContext = useEuiTheme();
  const styles = filterBarStyles(themeContext, props.afterQueryBar);

  const groupRef = useRef<HTMLDivElement>(null);

  const filterCount = props.filters?.length ?? 0;
  const disabledFilterCount = useMemo(
    () => props.filters?.filter(({ meta: { disabled } }) => disabled).length ?? 0,
    [props.filters]
  );
  const appliedFilterCount = useMemo(
    () => filterCount - disabledFilterCount,
    [disabledFilterCount, filterCount]
  );

  const isCollapsible = filterCount > 1;
  const expandTooltipRef = useRef<EuiToolTip>(null);

  /** isCollapsed initial state should be as follows:
   * - Expanded by default
   * - Pull from localStorage ONLY if the filter bar is initially collapsible
   *   (If the user has not yet added at least 2 filters, we never want to immediately collapse
   *    the filter bar the moment they add enough filters to make it collapsible. It should only
   *    collapse in response to the user manually closing it. If the user then refreshes the page,
   *    localStorage may initialize the filter bar as collasped, which is acceptable)
   */
  const [isCollapsed, setIsCollapsed] = useState(
    isCollapsible ? storage.get(FILTER_BAR_COLLAPSED_SETTING) ?? false : false
  );
  const expandablePillsId = useGeneratedHtmlId();

  const filterPills = (
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
  );

  const onToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
    storage.set(FILTER_BAR_COLLAPSED_SETTING, !isCollapsed);
    // Hide the expand button tooltip on click so that it doesn't block the new content
    expandTooltipRef.current?.hideToolTip();
  }, [isCollapsed, storage]);

  if (!isCollapsible) {
    return filterPills;
  }

  /**
   * Use nested plural to display
   * - "X filters applied" if all filters are applied
   * - "X filters disabled" if all filters are disabled
   * - "X filters applied, Y disabled" if only some filters are disabled
   */
  const filtersAppliedLabel = i18n.translate(
    'unifiedSearch.filter.filterBar.filtersAppliedAccordionButton',
    {
      defaultMessage: `
        {appliedFilterCount, plural, 
          =0 {
            {disabledFilterCount, plural, 
              =0 {0 filters applied} 
              other {# filters disabled}
            }
          } 
          one {# filter applied{
            disabledFilterCount, plural, 
              =0 {} 
              other {, # disabled}
            }
          } 
          other {# filters applied{
            disabledFilterCount, plural, 
              =0 {} 
              other {, # disabled}
            }
          }
        }`,
      values: { appliedFilterCount, disabledFilterCount },
    }
  );

  return (
    <EuiFlexGroup
      css={isCollapsed ? styles.filterBarWrapperCollaped : styles.filterBarWrapperExpanded}
      alignItems={!isCollapsed ? 'flexStart' : 'center'}
      gutterSize="xs"
      wrap={!isCollapsed}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip
          ref={expandTooltipRef}
          content={!isCollapsed ? collapseLabel : expandLabel}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType={!isCollapsed ? 'arrowDown' : 'arrowRight'}
            aria-label={!isCollapsed ? collapseLabel : expandLabel}
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-controls={expandablePillsId}
            iconSize="s"
          />
        </EuiToolTip>
      </EuiFlexItem>
      {/* For a11y compliance, show and hide filtersAppliedLabel and filterPills using CSS instead of re-renders */}
      <EuiFlexItem
        css={!isCollapsed ? css({ display: 'none' }) : null}
        aria-hidden={!isCollapsed}
        grow={false}
      >
        <EuiButtonEmpty
          flush="left"
          type="button"
          onClick={onToggleCollapse}
          color="text"
          aria-expanded={!isCollapsed}
          size="xs"
        >
          {filtersAppliedLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem
        id={expandablePillsId}
        aria-hidden={isCollapsed}
        grow={true}
        css={[
          css({ minWidth: 0 }),
          styles.pillsScrollContainer,
          isCollapsed ? css({ blockSize: 0 }) : null,
        ]}
      >
        {filterPills}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const FilterBar = injectI18n(withKibana(FilterBarUI));
