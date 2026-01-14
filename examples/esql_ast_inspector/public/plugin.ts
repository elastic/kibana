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
import { mount } from './mount';
import image from './esql_ast_inspector.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class ESQLASTInspectorPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'esql_ast_inspector',
      title: 'ES|QL AST Inspector',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'esql_ast_inspector',
      title: 'ES|QL AST Inspector',
      description: 'Inspect the ES|QL AST.',
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-esql-language/parser/README.md',
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
