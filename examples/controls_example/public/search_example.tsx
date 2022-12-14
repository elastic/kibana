/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  LazyControlGroupRenderer,
  ControlGroupContainer,
  useControlGroupContainerContext,
  ControlStyle,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { PLUGIN_ID } from './constants';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

interface Props {
  dataView: DataViewSpec;
  navigation: NavigationPublicPluginStart;
}

export const SearchExample = ({ dataView, navigation }: Props) => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [query, setQuery] = useState<Query>();
  const [timeRange, setTimeRange] = useState<TimeRange>();

  return (
    <>
      <EuiTitle>
        <h2>Search example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Pass filters, query, and time range to narrow controls. Combine search bar filters with controls filters to narrow data table.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <navigation.ui.TopNavMenu
          appName={PLUGIN_ID}
          filters={filters}
          indexPatterns={[dataView]}
          onFiltersUpdated={setFilters}
          onQuerySubmit={({ dateRange, query }) => {
            setQuery(query);
            setTimeRange(dateRange);
          }}
          query={query}
          showSearchBar={true}
          useDefaultBehaviors={true}
        />
        <ControlGroupRenderer
          filters={filters}
          getInitialInput={async (initialInput, builder) => {
            await builder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id,
              title: 'Destintion country',
              fieldName: 'geo.dest',
              width: 'medium',
              grow: false,
            });
            await builder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id,
              fieldName: 'bytes',
              width: 'medium',
              grow: true,
              title: 'Bytes',
            });
            return {
              ...initialInput,
              viewMode: ViewMode.VIEW,
            };
          }}
          query={query}
          timeRange={timeRange}
        />
      </EuiPanel>
    </>
  );
}