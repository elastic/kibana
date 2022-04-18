/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type { Filter } from '@kbn/es-query';
import classNames from 'classnames';
import React, { useRef } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import FilterBadgesWrapper from './filter_badges_wrapper';

export interface Props {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  className: string;
  indexPatterns: DataView[];
  intl: InjectedIntl;
  timeRangeForSuggestionsOverride?: boolean;
}

const FilterBarUI = React.memo(function FilterBarUI(props: Props) {
  const groupRef = useRef<HTMLDivElement>(null);
  const classes = classNames('globalFilterBar', props.className);

  return (
    <EuiFlexGroup
      className="globalFilterGroup"
      gutterSize="none"
      alignItems="flexStart"
      responsive={false}
    >
      <EuiFlexItem className="globalFilterGroup__filterFlexItem">
        <EuiFlexGroup
          ref={groupRef}
          className={classes}
          wrap={true}
          responsive={false}
          gutterSize="xs"
          alignItems="center"
          tabIndex={-1}
        >
          <FilterBadgesWrapper
            filters={props.filters!}
            onFiltersUpdated={props.onFiltersUpdated}
            indexPatterns={props.indexPatterns!}
            timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const FilterBar = injectI18n(FilterBarUI);
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBar;
