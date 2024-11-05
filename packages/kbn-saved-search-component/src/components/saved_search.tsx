/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type {
  SearchEmbeddableSerializedState,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableApi,
} from '@kbn/discover-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SavedSearchComponentProps } from '../types';

const TIMESTAMP_FIELD = '@timestamp';

export const SavedSearchComponent: React.FC<SavedSearchComponentProps> = (props) => {
  // Creates our *initial* search source and set of attributes.
  // Future changes to these properties will be facilitated by the Parent API from the embeddable.
  const [initialSerializedState, setInitialSerializedState] =
    useState<SerializedPanelState<SearchEmbeddableSerializedState>>();

  const { dependencies, timeRange, query, filters, index, timestampField, height } = props;

  useEffect(() => {
    // Ensure we get a stabilised set of initial state incase dependencies change, as
    // the data view creation process is async.
    const abortController = new AbortController();

    async function createInitialSerializedState() {
      const { dataViews, searchSource: searchSourceService } = dependencies;
      const { enableFlyout: flyoutEnabled = true, enableFilters: filtersEnabled = true } =
        props.displayOptions ?? {};
      // Ad-hoc data view
      const dataView = await dataViews.create({
        title: index,
        timeFieldName: timestampField ?? TIMESTAMP_FIELD,
      });
      if (!abortController.signal.aborted) {
        // Search source
        const searchSource = searchSourceService.createEmpty();
        searchSource.setField('index', dataView);
        searchSource.setField('query', query);
        searchSource.setField('filter', filters);
        const { searchSourceJSON, references } = searchSource.serialize();
        // By-value saved object structure
        const attributes = {
          kibanaSavedObjectMeta: {
            searchSourceJSON,
          },
        };
        setInitialSerializedState({
          rawState: {
            attributes: { ...attributes, references },
            timeRange,
            nonPersistedDisplayOptions: {
              enableFlyout: flyoutEnabled,
              enableFilters: filtersEnabled,
            },
          } as SearchEmbeddableSerializedState,
          references,
        });
      }
    }

    createInitialSerializedState();

    return () => {
      abortController.abort();
    };
  }, [dependencies, filters, index, props.displayOptions, query, timeRange, timestampField]);

  return initialSerializedState ? (
    <div style={{ height: height ?? '100%' }}>
      <SavedSearchComponentTable {...props} initialSerializedState={initialSerializedState} />
    </div>
  ) : null;
};

const SavedSearchComponentTable: React.FC<
  SavedSearchComponentProps & { initialSerializedState: any }
> = (props) => {
  const { dependencies, initialSerializedState, filters, query, timeRange, timestampField, index } =
    props;
  const embeddableApi = useRef<SearchEmbeddableApi | undefined>(undefined);

  const parentApi = useMemo(() => {
    return {
      getSerializedStateForChild: () => {
        return initialSerializedState;
      },
    };
  }, [initialSerializedState]);

  useEffect(
    function syncIndex() {
      if (!embeddableApi.current) return;

      const abortController = new AbortController();

      async function updateDataView(indexPattern: string) {
        const { dataViews } = dependencies;
        // Ad-hoc data view
        const dataView = await dataViews.create({
          title: index,
          timeFieldName: timestampField ?? TIMESTAMP_FIELD,
        });
        if (!abortController.signal.aborted) {
          embeddableApi?.current?.setDataViews([dataView]);
        }
      }

      updateDataView(index);

      return () => {
        abortController.abort();
      };
    },
    [dependencies, index, timestampField]
  );

  useEffect(
    function syncFilters() {
      if (!embeddableApi.current) return;
      embeddableApi.current.setFilters(filters);
    },
    [filters]
  );

  useEffect(
    function syncQuery() {
      if (!embeddableApi.current) return;
      embeddableApi.current.setQuery(query);
    },
    [query]
  );

  useEffect(
    function syncTimeRange() {
      if (!embeddableApi.current) return;
      embeddableApi.current.setTimeRange(timeRange);
    },
    [timeRange]
  );

  return (
    <ReactEmbeddableRenderer<
      SearchEmbeddableSerializedState,
      SearchEmbeddableRuntimeState,
      SearchEmbeddableApi
    >
      maybeId={undefined}
      type={SEARCH_EMBEDDABLE_TYPE}
      getParentApi={() => parentApi}
      onApiAvailable={(api) => {
        embeddableApi.current = api;
      }}
    />
  );
};
