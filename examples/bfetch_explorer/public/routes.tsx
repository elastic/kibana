/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
