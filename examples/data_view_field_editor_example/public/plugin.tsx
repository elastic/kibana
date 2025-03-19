/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';

interface StartDeps {
  data: DataPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
}

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class DataViewFieldEditorPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    core.application.register({
      id: 'dataViewFieldEditorExample',
      title: 'Data view field editor example',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(depsStart, params);
      },
    });

    deps.developerExamples.register({
      appId: 'dataViewFieldEditorExample',
      title: 'Data view field editor',
      description: `DataViewFieldEditor provides a UI for editing data view fields directly from Kibana apps. This example plugin demonstrates integration.`,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data_view_field_editor/README.md',
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
