/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SolutionNavigationDefinition } from '@kbn/core-chrome-browser';
import { of } from 'rxjs';

export const definition: SolutionNavigationDefinition = {
  id: 'es',
  title: 'Search',
  icon: 'logoElasticsearch',
  homePage: 'dev_tools', // Temp. Wil be updated when all links are registered
  navigationTree$: of({
    body: [
      // Temp. In future work this will be loaded from a package
      {
        type: 'navGroup',
        id: 'search_project_nav',
        title: 'Search',
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'dev_tools',
            title: 'Dev Tools',
            link: 'dev_tools:console',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
            },
            spaceBefore: 'm',
          },
        ],
      },
    ],
  }),
};
