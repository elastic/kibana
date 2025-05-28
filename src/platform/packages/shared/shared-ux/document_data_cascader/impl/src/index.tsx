/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps } from 'react';
import { DataPoolerProvider } from './lib/store';
import { ESQLDataPooler } from './components';

export default function ({
  dataViewId,
  query,
}: ComponentProps<typeof ESQLDataPooler> & ComponentProps<typeof DataPoolerProvider>) {
  return (
    <DataPoolerProvider query={query}>
      <ESQLDataPooler dataViewId={dataViewId} />
    </DataPoolerProvider>
  );
}
