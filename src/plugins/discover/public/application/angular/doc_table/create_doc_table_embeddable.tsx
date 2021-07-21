/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { DocTable, DocTableProps } from './doc_table';

export function DiscoverDocTableEmbeddable(renderProps: DocTableProps) {
  return (
    <I18nProvider>
      <DocTable
        columns={renderProps.columns}
        rows={renderProps.rows}
        type="embeddable"
        totalHitCount={renderProps.totalHitCount}
        indexPattern={renderProps.indexPattern}
        onSort={renderProps.onSort}
        onAddColumn={renderProps.onAddColumn}
        onMoveColumn={renderProps.onMoveColumn}
        onRemoveColumn={renderProps.onRemoveColumn}
        sort={renderProps.sort}
        onFilter={renderProps.onFilter}
        useNewFieldsApi={renderProps.useNewFieldsApi}
        searchDescription={renderProps.searchDescription}
        sharedItemTitle={renderProps.sharedItemTitle}
        isLoading={renderProps.isLoading}
        dataTestSubj="embeddedSavedSearchDocTable"
      />
    </I18nProvider>
  );
}
