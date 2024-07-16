/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { MARKDOWN_ID } from './constants';
import { registerConvertLegacyMarkdownAction } from './convert_legacy_markdown_action';
import { registerMarkdownActions } from './markdown_actions';

export interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export interface StartDeps {
  uiActions: UiActionsStart;
}

export class DashboardMarkdownPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { embeddable }: SetupDeps) {
    embeddable.registerReactEmbeddableFactory(MARKDOWN_ID, async () => {
      const { markdownEmbeddableFactory } = await import('./markdown_embeddable');
      return markdownEmbeddableFactory;
    });
  }

  public start(core: CoreStart, deps: StartDeps) {
    registerMarkdownActions(deps.uiActions);
    registerConvertLegacyMarkdownAction(deps.uiActions);
  }

  public stop() {}
}
