/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps, type PropsWithChildren } from 'react';
import { DataPoolerProvider, useDataPoolerState } from '../lib';

type ESQLDataPoolerProps = Pick<ComponentProps<typeof DataPoolerProvider>, 'query'>;

export function ESQLDataPooler({ query }: PropsWithChildren<ESQLDataPoolerProps>) {
  const state = useDataPoolerState();

  return (
    <div>
      <h1>ESQL Data Pooler</h1>
      <p>Query: {state.currentQueryString}</p>
    </div>
  );
}
