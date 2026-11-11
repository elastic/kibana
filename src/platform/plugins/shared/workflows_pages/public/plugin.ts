/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PAGE_APP_ROUTE } from '../common';

/**
 * Registers the chromeless app behind a workflow page URL. The plugin loads on anonymous
 * pages, so a visitor without a Kibana session gets the form. The server checks the URL
 * secret before it serves the app, so this only draws the form.
 */
export class WorkflowsPagesPlugin implements Plugin {
  public setup(core: CoreSetup): void {
    // Anonymous paths match exactly, and every page URL is unique. Register the current
    // one so core loads default capabilities and the security plugin skips the login page.
    const currentPath = core.http.basePath.remove(window.location.pathname);
    if (currentPath.startsWith(`${PAGE_APP_ROUTE}/`)) {
      core.http.anonymousPaths.register(currentPath);
    }

    core.application.register({
      id: 'workflowsPages',
      title: i18n.translate('workflows.pages.appTitle', { defaultMessage: 'Workflow page' }),
      appRoute: PAGE_APP_ROUTE,
      chromeless: true,
      visibleIn: [],
      mount: async ({ element }: AppMountParameters) => {
        const [[coreStart], { renderPageApp }] = await Promise.all([
          core.getStartServices(),
          import('./page_app/page_app'),
        ]);
        return renderPageApp(coreStart, element);
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
