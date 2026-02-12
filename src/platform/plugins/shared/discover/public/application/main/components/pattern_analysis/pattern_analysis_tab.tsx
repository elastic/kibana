/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, type FC, useState, useEffect, useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import { PatternAnalysisTable, type PatternAnalysisTableProps } from './pattern_analysis_table';
import { useCurrentTabSelector } from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { createSearchSource } from '../../state_management/utils/create_search_source';
import { searchSourceComparator } from '../../state_management/redux/selectors/unsaved_changes';

export const PatternAnalysisTab: FC<Omit<PatternAnalysisTableProps, 'query' | 'filters'>> = memo(
  (props) => {
    const services = useDiscoverServices();
    const appState = useCurrentTabSelector((state) => state.appState);
    const globalState = useCurrentTabSelector((state) => state.globalState);

    const [searchSource, setSearchSource] = useState(() => {
      return createSearchSource({
        dataView: props.dataView,
        appState,
        globalState,
        services,
      });
    });
    const searchSourceRef = useLatest(searchSource);

    useEffect(() => {
      const newSearchSource = createSearchSource({
        dataView: props.dataView,
        appState,
        globalState,
        services,
      });
      if (
        !searchSourceComparator(
          searchSourceRef.current.getSerializedFields(),
          newSearchSource.getSerializedFields()
        )
      ) {
        setSearchSource(newSearchSource);
      }
    }, [appState, globalState, props.dataView, services, searchSourceRef]);

    const savedSearch = useMemo(() => ({ searchSource }), [searchSource]);

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
