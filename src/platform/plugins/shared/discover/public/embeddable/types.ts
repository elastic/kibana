/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  CanCancelRequests,
  EmbeddableApiContext,
  CanOverrideHoverActions,
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDescription,
  PublishesEsql,
  PublishesProjectRoutingOverrides,
  PublishesSavedObjectId,
  PublishesWritableTitle,
  PublishesWritableUnifiedSearch,
  PublishingSubject,
  SerializedTimeRange,
  SerializedTitles,
  SupportsJsonExport,
} from '@kbn/presentation-publishing';
import type {
  DiscoverSessionApiEmbeddableOverrides,
  DiscoverSessionApiEmbeddableTab,
} from '@kbn/as-code-discover-schema';
import type { SavedSearch, SerializableSavedSearch } from '@kbn/saved-search-plugin/common/types';
import type { EsqlSource } from '@kbn/data-source';
import type { BehaviorSubject } from 'rxjs';
import type { IDslPagination } from '@kbn/search-types';
import type { PublishesWritableDataSources } from '@kbn/presentation-publishing/interfaces/publishes_data_sources';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type {
  NonPersistedDisplayOptions,
  SearchEmbeddablePanelApiState,
} from '../../common/embeddable/types';

export type { SearchEmbeddablePanelApiState };

/**
 * Input state accepted by the search embeddable factory.
 */
export type SearchEmbeddableInputState = SearchEmbeddablePanelApiState & {
  nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
};

export type SearchEmbeddablePublicState = Pick<
  SerializableSavedSearch,
  | 'rowHeight'
  | 'rowsPerPage'
  | 'headerRowHeight'
  | 'columns'
  | 'sort'
  | 'sampleSize'
  | 'viewMode'
  | 'grid'
  | 'density'
  | 'documentsDisplayMode'
  | 'jsonModeSettings'
> & {
  rows: DataTableRecord[];
  /** The ES|QL source of the fetched rows, with the result columns. */
  resultDataSource: EsqlSource | undefined;
  totalHitCount: number | undefined;
  inspectorAdapters: Record<string, unknown>;
  pagination: IDslPagination | undefined;
  isLoadingMore: boolean;
};

export type SearchEmbeddableStateManager = {
  [key in keyof Required<SearchEmbeddablePublicState>]: BehaviorSubject<
    SearchEmbeddablePublicState[key]
  >;
};

export type SearchEmbeddableSerializedAttributes = Omit<
  SearchEmbeddablePublicState,
  | 'rows'
  | 'resultDataSource'
  | 'totalHitCount'
  | 'searchSource'
  | 'inspectorAdapters'
  | 'pagination'
  | 'isLoadingMore'
> &
  Pick<SerializableSavedSearch, 'serializedSearchSource' | 'tabTypeState'>;

/** A session tab as a linked panel shows it. */
export interface SearchEmbeddableSessionTab {
  id: string;
  label: string;
  /** Undefined for a Classic tab saved without a Data View, which the panel cannot show */
  tab?: DiscoverSessionApiEmbeddableTab;
  /** ID of the tab's inline Data View, so filters that reference the view still match it */
  inlineDataViewId?: string;
  /** Stored filters of a Classic tab, which the public format cannot always represent */
  filters?: Filter[];
}

export type SearchEmbeddableRuntimeState = SearchEmbeddableSerializedAttributes &
  SerializedTitles &
  SerializedTimeRange &
  SerializedDrilldowns & {
    savedObjectTitle?: string;
    savedObjectId?: string;
    savedObjectDescription?: string;
    nonPersistedDisplayOptions?: NonPersistedDisplayOptions;
    /** Tab of a by-value panel */
    tab?: DiscoverSessionApiEmbeddableTab;
    selectedTabId?: string;
    /** Session tabs of a linked panel */
    tabs?: SearchEmbeddableSessionTab[];
    /** Overrides of a linked panel, as stored by the dashboard */
    overrides?: DiscoverSessionApiEmbeddableOverrides;
  };

export type SearchEmbeddableApi = DefaultEmbeddableApi<SearchEmbeddablePanelApiState> &
  PublishesSavedObjectId &
  PublishesDataLoading &
  PublishesBlockingError &
  Required<PublishesWritableTitle> &
  Required<PublishesDescription> &
  PublishesWritableSavedSearch &
  PublishesWritableDataSources<DataView> &
  PublishesWritableUnifiedSearch &
  PublishesProjectRoutingOverrides &
  PublishesEsql &
  HasLibraryTransforms &
  HasTimeRange &
  HasInspectorAdapters &
  PublishesSelectedTabId &
  CanCancelRequests &
  Partial<HasEditCapabilities & PublishesSavedObjectId> &
  Partial<CanOverrideHoverActions> &
  HasDrilldowns &
  HasSupportedTriggers &
  SupportsJsonExport;

export interface PublishesSavedSearch {
  savedSearch$: PublishingSubject<SavedSearch>;
}

export interface PublishesWritableSavedSearch extends PublishesSavedSearch {
  setColumns: (columns: string[] | undefined) => void;
}

export const apiPublishesSavedSearch = (
  api: EmbeddableApiContext['embeddable']
): api is PublishesSavedSearch => {
  const embeddable = api as PublishesSavedSearch;
  return Boolean(embeddable.savedSearch$);
};

/**
 * Interface for publishing the selected tab ID
 * @interface PublishesSelectedTabId
 * @property {() => string | undefined} getSelectedTabId - Returns the ID of the selected tab
 */
export interface PublishesSelectedTabId {
  getSelectedTabId: () => string | undefined;
}

export interface HasTimeRange {
  hasTimeRange(): boolean;
}
