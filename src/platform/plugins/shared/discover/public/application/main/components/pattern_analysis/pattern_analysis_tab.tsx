/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, type FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { PatternAnalysisTable, type PatternAnalysisTableProps } from './pattern_analysis_table';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const PatternAnalysisTab: FC<Omit<PatternAnalysisTableProps, 'query' | 'filters'>> = memo(
  (props) => {
    const services = useDiscoverServices();
    const searchSourceUpdate = useObservable(props.stateContainer.getSearchSourceUpdates$());

    const savedSearch = useMemo(() => {
      const newSavedSearch = services.savedSearch.getNew();
      if (searchSourceUpdate?.value) {
        newSavedSearch.searchSource = searchSourceUpdate.value;
      }
      return newSavedSearch;
    }, [searchSourceUpdate, services.savedSearch]);

    if (!searchSourceUpdate?.value) {
      return null;
    }

    return (
      <PatternAnalysisTable
        dataView={props.dataView}
        switchToDocumentView={props.switchToDocumentView}
        savedSearch={savedSearch}
        stateContainer={props.stateContainer}
        trackUiMetric={props.trackUiMetric}
        renderViewModeToggle={props.renderViewModeToggle}
      />
    );
  }
);
