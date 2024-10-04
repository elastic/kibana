/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocTableEmbeddable, DocTableEmbeddableProps } from './doc_table_embeddable';

export function DiscoverDocTableEmbeddable(renderProps: DocTableEmbeddableProps) {
  return (
    <DocTableEmbeddable
      columns={renderProps.columns}
      rows={renderProps.rows}
      rowsPerPageState={renderProps.rowsPerPageState}
      sampleSizeState={renderProps.sampleSizeState}
      onUpdateRowsPerPage={renderProps.onUpdateRowsPerPage}
      totalHitCount={renderProps.totalHitCount}
      dataView={renderProps.dataView}
      onSort={renderProps.onSort}
      onAddColumn={renderProps.onAddColumn}
      onMoveColumn={renderProps.onMoveColumn}
      onRemoveColumn={renderProps.onRemoveColumn}
      sort={renderProps.sort}
      filters={renderProps.filters}
      onFilter={renderProps.onFilter}
      useNewFieldsApi={renderProps.useNewFieldsApi}
      searchDescription={renderProps.searchDescription}
      sharedItemTitle={renderProps.sharedItemTitle}
      isLoading={renderProps.isLoading}
      isEsqlMode={renderProps.isEsqlMode}
      interceptedWarnings={renderProps.interceptedWarnings}
    />
  );
}
