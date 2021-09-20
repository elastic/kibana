/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '../../../src/core/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { IndexPatternFieldEditorStart } from '../../../src/plugins/index_pattern_field_editor/public';

interface StartDeps {
  data: DataPublicPluginStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class IndexPatternFieldEditorPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    core.application.register({
      id: 'indexPatternFieldEditorExample',
      title: 'Index pattern field editor example',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(depsStart, params);
      },
    });

    deps.developerExamples.register({
      appId: 'indexPatternFieldEditorExample',
      title: 'Index pattern field editor',
      description: `IndexPatternFieldEditor provides a UI for editing index pattern fields directly from Kibana apps.  This example plugin demonstrates integration.`,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/master/src/plugins/index_pattern_field_editor/README.md',
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
