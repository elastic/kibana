/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { AwaitingControlGroupAPI, ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { PLUGIN_ID } from '../../constants';

interface Props {
  data: DataPublicPluginStart;
  dataView: DataView;
  navigation: NavigationPublicPluginStart;
}

export const SearchExample = ({ data, dataView, navigation }: Props) => {
  const [controlFilters, setControlFilters] = useState<Filter[]>([]);
  const [controlGroupAPI, setControlGroupAPI] = useState<AwaitingControlGroupAPI>();
  const [hits, setHits] = useState(0);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState<Query | undefined>({
    language: 'kuery',
    query: '',
  });
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-7d', to: 'now' });

  useEffect(() => {
    if (!controlGroupAPI) {
      return;
    }
    const subscription = controlGroupAPI.onFiltersPublished$.subscribe((newFilters) => {
      setControlFilters([...newFilters]);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupAPI]);

  useEffect(() => {
    const abortController = new AbortController();
    const search = async () => {
      setIsSearching(true);
      const searchSource = await data.search.searchSource.create();
      searchSource.setField('index', dataView);
      searchSource.setField('size', 0);
      searchSource.setField('filter', [
        ...filters,
        ...controlFilters,
        data.query.timefilter.timefilter.createFilter(dataView, timeRange),
      ] as Filter[]);
      searchSource.setField('query', query);
      const { rawResponse: resp } = await lastValueFrom(
        searchSource.fetch$({
          abortSignal: abortController.signal,
          sessionId: uuidv4(),
          legacyHitsTotal: false,
        })
      );
      const total = resp.hits?.total as undefined | { relation: string; value: number };
      if (total !== undefined) {
        setHits(total.value);
      }
      setIsSearching(false);
    };

    search().catch((error) => {
      setIsSearching(false);
      if (error.name === 'AbortError') {
        // ignore abort errors
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [controlFilters, data, dataView, filters, query, timeRange]);

  return (
    <>
      <EuiTitle>
        <h2>Search example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Pass filters, query, and time range to narrow controls. Combine search bar filters with
          controls filters to narrow results.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <navigation.ui.TopNavMenu
          appName={PLUGIN_ID}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          filters={filters}
          indexPatterns={[dataView]}
          onFiltersUpdated={(newFilters) => {
            // filterManager.setFilters populates filter.meta so filter pill has pretty title
            data.query.filterManager.setFilters(newFilters);
            setFilters(newFilters);
          }}
          onQuerySubmit={({ dateRange, query: newQuery }) => {
            setQuery(newQuery);
            setTimeRange(dateRange);
          }}
          query={query}
          showSearchBar={true}
        />
        <ControlGroupRenderer
          filters={filters}
          getCreationOptions={async (initialInput, builder) => {
            await builder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id!,
              title: 'Destintion country',
              fieldName: 'geo.dest',
              width: 'medium',
              grow: false,
            });
            await builder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id!,
              fieldName: 'bytes',
              width: 'medium',
              grow: true,
              title: 'Bytes',
            });
            return {
              initialInput: {
                ...initialInput,
                viewMode: ViewMode.VIEW,
              },
            };
          }}
          query={query}
          ref={setControlGroupAPI}
          timeRange={timeRange}
        />
        <EuiCallOut title="Search results">
          {isSearching ? <EuiLoadingSpinner size="l" /> : <p>Hits: {hits}</p>}
        </EuiCallOut>
      </EuiPanel>
    </>
  );
};
