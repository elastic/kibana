/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { DataViewListItem } from '@kbn/data-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { DataTableRecord } from '../../../../types';
import { DiscoverStateContainer } from '../../services/discover_state';
import { SavedSearchData } from '../../hooks/use_saved_search';

export interface DiscoverLayoutProps {
  dataView: DataView;
  dataViewList: DataViewListItem[];
  inspectorAdapters: { requests: RequestAdapter };
  navigateTo: (url: string) => void;
  onChangeDataView: (id: string) => void;
  expandedDoc?: DataTableRecord;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  savedSearchData$: SavedSearchData;
  stateContainer: DiscoverStateContainer;
  persistDataView: (dataView: DataView) => Promise<DataView | undefined>;
  updateAdHocDataViewId: (dataView: DataView) => Promise<DataView>;
  adHocDataViewList: DataView[];
}
