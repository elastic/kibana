/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { TableListView, TableListViewKibanaProvider } from '@kbn/content-management-table-list';

export const App: FunctionComponent = () => {
  return (
    <TableListView
      entityName="test"
      entityNamePlural="tests"
      findItems={() => Promise.resolve({ total: 0, hits: [] })}
      initialFilter=""
      initialPageSize={10}
      listingLimit={1000}
      tableListTitle="Files"
      onClickTitle={() => {}}
    />
  );
};
