/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, type FC } from 'react';
import { useQuerySubscriber } from '@kbn/unified-field-list/src/hooks/use_query_subscriber';
import { useSavedSearch } from '../../state_management/discover_state_provider';
import { PatternAnalysisTable, type PatternAnalysisTableProps } from './pattern_analysis_table';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const PatternAnalysisTab: FC<Omit<PatternAnalysisTableProps, 'query' | 'filters'>> = memo(
  (props) => {
    const services = useDiscoverServices();
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
    });
    const savedSearch = useSavedSearch();

    return (
      <PatternAnalysisTable
        dataView={props.dataView}
        filters={querySubscriberResult.filters}
        query={querySubscriberResult.query}
        switchToDocumentView={props.switchToDocumentView}
        savedSearch={savedSearch}
        stateContainer={props.stateContainer}
        trackUiMetric={props.trackUiMetric}
        renderViewModeToggle={props.renderViewModeToggle}
      />
    );
  }
);
