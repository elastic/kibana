/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SolutionProperties } from '../../types';

const MOCK_LOCATOR_ID = 'MOCK_LOCATOR_ID';

export const mocks: SolutionProperties & { locatorId: string } = {
  id: 'example_project',
  icon: 'logoObservability',
  name: 'Example Project',
  locatorId: MOCK_LOCATOR_ID,
  items: [
    {
      id: 'root',
      name: '',
      items: [
        {
          id: 'get_started',
          name: 'Get started',
          locator: { id: MOCK_LOCATOR_ID, params: { view: '/app/observability/overview' } },
        },
        {
          id: 'alerts',
          name: 'Alerts',
          locator: { id: MOCK_LOCATOR_ID, params: { view: '/app/observability/alerts' } },
        },
        {
          id: 'cases',
          name: 'Cases',
          locator: { id: MOCK_LOCATOR_ID, params: { view: '/app/observability/cases' } },
        },
      ],
    },
    {
      id: 'signals',
      name: 'Signals',
      items: [
        {
          id: 'logs',
          name: 'Logs',
          locator: {
            id: MOCK_LOCATOR_ID,
            params: { view: '/app/management/ingest/ingest_pipelines' },
          },
        },
        {
          id: 'tracing',
          name: 'Tracing',
          locator: {
            id: MOCK_LOCATOR_ID,
            params: { view: '/app/management/ingest/ingest_pipelines' },
          },
        },
      ],
    },
  ],
};
