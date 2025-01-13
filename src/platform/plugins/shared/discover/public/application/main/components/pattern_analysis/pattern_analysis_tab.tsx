/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, type FC } from 'react';
import { useSavedSearch } from '../../state_management/discover_state_provider';
import { PatternAnalysisTable, type PatternAnalysisTableProps } from './pattern_analysis_table';

export const PatternAnalysisTab: FC<Omit<PatternAnalysisTableProps, 'query' | 'filters'>> = memo(
  (props) => {
    const savedSearch = useSavedSearch();

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
