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
          href: '/app/example_project/get_started',
        },
        {
          id: 'alerts',
          name: 'Alerts',
          href: '/app/example_project/alerts',
        },
        {
          id: 'cases',
          name: 'Cases',
          href: '/app/example_project/cases',
        },
      ],
    },
    {
      id: 'example_settings',
      name: 'Settings',
      items: [
        {
          id: 'logs',
          name: 'Logs',
          href: '/app/management/logs',
        },
        {
          id: 'signals',
          name: 'Signals',
          href: '/app/management/signals',
        },
        {
          id: 'tracing',
          name: 'Tracing',
          href: '/app/management/tracing',
        },
      ],
    },
  ],
};
