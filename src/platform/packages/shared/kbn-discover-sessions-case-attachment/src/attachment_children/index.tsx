/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runtime requirements: @kbn/saved-search-component, @kbn/cases-plugin
import React, { useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '@kbn/cases-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiSpacer } from '@elastic/eui';
import { LazySavedSearchComponent } from '@kbn/saved-search-component'; // runtime requirement
import type { SavedSearchCasesAttachmentPersistedState } from '@kbn/discover-utils';
import { SearchDetails } from './search_details';

interface SavedSearchPersistableStateAttachmentViewProps {
  persistableStateAttachmentState: SavedSearchCasesAttachmentPersistedState;
}

export const CommentChildren: React.FC<SavedSearchPersistableStateAttachmentViewProps> = ({
  persistableStateAttachmentState,
}) => {
  const [dataView, setDataView] = React.useState<null | DataView>(null);
  const {
    embeddable,
    data: {
      search: { searchSource },
      dataViews: dataViewsService,
    },
  } = useKibana<CoreStart & CasesPublicStartDependencies>().services; // Component is rendered with the cases app. Type for Kibana services must match CasesPublicStartDependencies
  const { index, timeRange, query, filters, timestampField } = persistableStateAttachmentState;

  useEffect(() => {
    const setAdHocDataView = async () => {
      if (dataView) return;
      const adHocDataView = await dataViewsService.create({
        title: index,
        timeFieldName: timestampField,
      });
      setDataView(adHocDataView);
    };
    setAdHocDataView();
  }, [dataView, index, timestampField, dataViewsService]);

  if (!dataView) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <SearchDetails
        index={index}
        timeRange={timeRange}
        query={query}
        filters={filters}
        dataView={dataView}
      />
      <LazySavedSearchComponent
        dependencies={{ embeddable, dataViews: dataViewsService, searchSource }}
        index={index}
        timeRange={timeRange}
        query={query}
        filters={filters}
        timestampField={timestampField}
        height={'360px'}
      />
    </>
  );
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default CommentChildren;
