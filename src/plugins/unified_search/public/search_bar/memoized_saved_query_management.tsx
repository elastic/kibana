/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { isOfQueryType } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SavedQueryManagementList } from '../saved_query_management';
import type { IUnifiedSearchPluginServices } from '../types';

interface MemoizedSavedQueryManagementProps {
  filters: any;
  query: any;
  savedQuery: any;
  showSaveQuery: any;
  onClearSavedQuery: any;
  onClose: () => void;
  onLoadSavedQuery: any;
}

function SavedQueryManagement({
  filters,
  query,
  savedQuery,
  showSaveQuery,
  onClearSavedQuery,
  onClose,
  onLoadSavedQuery,
}: MemoizedSavedQueryManagementProps) {
  const {
    data: {
      query: { savedQueries },
    },
  } = useKibana<IUnifiedSearchPluginServices>().services;

  const hasFiltersOrQuery = () => {
    const hasFilters = Boolean(filters!.length > 0);
    const hasQuery = Boolean(query && isOfQueryType(query) && query.query);
    return hasFilters || hasQuery;
  };

  return (
    <SavedQueryManagementList
      hasFiltersOrQuery={hasFiltersOrQuery()}
      loadedSavedQuery={savedQuery}
      savedQueryService={savedQueries}
      showSaveQuery={showSaveQuery}
      onClearSavedQuery={onClearSavedQuery}
      onClose={onClose}
      onLoad={onLoadSavedQuery}
    />
  );
}

export const MemoizedSavedQueryManagement = React.memo(SavedQueryManagement);
