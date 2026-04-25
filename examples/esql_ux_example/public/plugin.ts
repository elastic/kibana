/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EsqlPluginStart } from '@kbn/esql/public';
import { mount } from './mount';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  esql: EsqlPluginStart;
}

export class ESQLUxExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'esql_ux_example',
      title: 'ES|QL UX Example',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'esql_ux_example',
      title: 'ES|QL Editor UX',
      description:
        'Test the ES|QL editor component with mock data. Useful for testing autocomplete, suggestions, and UI interactions.',
      links: [
        {
          label: 'ES|QL Editor',
          href: 'https://github.com/elastic/kibana/tree/main/src/platform/packages/private/kbn-esql-editor',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
