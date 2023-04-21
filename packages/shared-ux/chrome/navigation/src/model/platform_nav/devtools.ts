/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorId } from '@kbn/shared-ux-locators';
import { NavItemProps } from '../../../types';

export const devtoolsItemSet: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        name: 'Console',
        id: 'console',
        locator: { id: LocatorId.ConsoleApp },
      },
      {
        name: 'Search profiler',
        id: 'search_profiler',
        locator: { id: LocatorId.SearchProfiler },
      },
      {
        name: 'Grok debugger',
        id: 'grok_debugger',
        locator: { id: LocatorId.GrokDebugger },
      },
      {
        name: 'Painless lab',
        id: 'painless_lab',
        locator: { id: LocatorId.PainlessLab },
      },
    ],
  },
];
