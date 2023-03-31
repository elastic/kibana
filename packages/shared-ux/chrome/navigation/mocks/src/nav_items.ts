/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavItemProps } from '../../types';

export const mockLocatorId = 'MOCK_LOCATOR_ID';

export const getMockNavItems = (): Array<NavItemProps<unknown>> => [
  {
    id: 'root',
    name: '',
    forceOpen: true,
    items: [
      {
        id: 'get_started',
        name: 'Get started',
        locator: { id: mockLocatorId, params: { view: '/app/observability/overview' } },
        isSelected: true,
      },
      {
        id: 'alerts',
        name: 'Alerts',
        locator: { id: mockLocatorId, params: { view: '/app/observability/alerts' } },
      },
      {
        id: 'cases',
        name: 'Cases',
        locator: { id: mockLocatorId, params: { view: '/app/observability/cases' } },
      },
    ],
  },
  {
    id: 'signals_root',
    name: 'Signals',
    items: [
      {
        id: 'logs',
        name: 'Logs',
        locator: { id: mockLocatorId, params: { view: '/app/management/ingest/ingest_pipelines' } },
      },
      {
        id: 'tracing',
        name: 'Tracing',
        locator: { id: mockLocatorId, params: { view: '/app/management/ingest/ingest_pipelines' } },
      },
    ],
  },
];
