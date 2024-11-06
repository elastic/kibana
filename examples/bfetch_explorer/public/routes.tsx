/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { PageDoubleIntegers } from './containers/app/pages/page_double_integers';
import { PageCountUntil } from './containers/app/pages/page_count_until';

interface RouteSectionDef {
  title: string;
  id: string;
  items: RouteDef[];
}

interface RouteDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

export const routes: RouteSectionDef[] = [
  {
    title: 'fetchStreaming',
    id: 'fetchStreaming',
    items: [
      {
        title: 'Count until',
        id: 'count-until',
        component: <PageCountUntil />,
      },
    ],
  },
  {
    title: 'batchedFunction',
    id: 'batchedFunction',
    items: [
      {
        title: 'Double integers',
        id: 'double-integers',
        component: <PageDoubleIntegers />,
      },
    ],
  },
];
