/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DeepLinkId as DevToolsLink } from '@kbn/deeplinks-devtools';

import type { NodeDefinitionWithChildren } from '../types';

export type ID = 'sharedux:devtools' | 'root';

export const devtools: NodeDefinitionWithChildren<DevToolsLink, ID> = {
  title: 'Developer tools',
  id: 'sharedux:devtools',
  icon: 'editorCodeBlock',
  children: [
    {
      id: 'root',
      children: [
        {
          title: 'Console',
          link: 'dev_tools:console',
        },
        {
          title: 'Search profiler',
          link: 'dev_tools:searchprofiler',
        },
        {
          title: 'Grok debugger',
          link: 'dev_tools:grokdebugger',
        },
        {
          title: 'Painless lab',
          link: 'dev_tools:painless_lab',
        },
      ],
    },
  ],
};
