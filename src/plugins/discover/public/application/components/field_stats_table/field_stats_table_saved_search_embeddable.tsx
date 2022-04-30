/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { FieldStatisticsTable, FieldStatisticsTableProps } from './field_stats_table';

export function FieldStatsTableSavedSearchEmbeddable(renderProps: FieldStatisticsTableProps) {
  return (
    <I18nProvider>
      <FieldStatisticsTable
        savedSearch={renderProps.savedSearch}
        services={renderProps.services}
        indexPattern={renderProps.indexPattern}
        query={renderProps.query}
        filters={renderProps.filters}
        columns={renderProps.columns}
        stateContainer={renderProps.stateContainer}
        onAddFilter={renderProps.onAddFilter}
      />
    </I18nProvider>
  );
}
