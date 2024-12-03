/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { mount } from './mount';
import image from './esql_validation_app.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class ESQLValidationExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'esql_validation_example',
      title: 'ES|QL Validation example',
      visibleIn: [],
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'esql_validation_example',
      title: 'ES|QL Validation',
      description: 'Validate ES|QL queries using the @kbn/esql-validation-autocomplete package.',
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/packages/kbn-esql-validation-autocomplete/README.md',
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
