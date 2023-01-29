/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import React, { useRef } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import FilterItems, { type FilterItemsProps } from './filter_item/filter_items';

import { filterBarStyles } from './filter_bar.styles';

export interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className?: string;
  indexPatterns: DataView[];
  intl: InjectedIntl;
  timeRangeForSuggestionsOverride?: boolean;
  hiddenPanelOptions?: FilterItemsProps['hiddenPanelOptions'];
  /**
   * Applies extra styles necessary when coupled with the query bar
   */
  afterQueryBar?: boolean;

  /**
   * Disable all interactive actions
   */
  isDisabled?: boolean;
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
      data-test-subj="unifiedFilterBar"
    >
      <FilterItems
        filters={props.filters!}
        onFiltersUpdated={props.onFiltersUpdated}
        indexPatterns={props.indexPatterns!}
        timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
        hiddenPanelOptions={props.hiddenPanelOptions}
        readOnly={props.isDisabled}
      />
    </EuiFlexGroup>
  );
});

const FilterBar = injectI18n(FilterBarUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBar;
