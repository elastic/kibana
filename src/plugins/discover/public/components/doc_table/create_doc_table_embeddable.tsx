/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { DocTableEmbeddable, DocTableEmbeddableProps } from './doc_table_embeddable';

export function DiscoverDocTableEmbeddable(renderProps: DocTableEmbeddableProps) {
  return (
    <I18nProvider>
      <DocTableEmbeddable
        columns={renderProps.columns}
        rows={renderProps.rows}
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
