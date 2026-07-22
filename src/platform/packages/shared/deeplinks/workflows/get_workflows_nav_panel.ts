/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_APP_ID } from './constants';
import { WorkflowsPageName, type WorkflowsPageName as WorkflowsPageNameType } from './deep_links';

/** Keep in sync with `WORKFLOWS_LIBRARY_ENABLED_SETTING_ID` in `@kbn/workflows`. */
const WORKFLOWS_LIBRARY_ENABLED_SETTING_ID = 'workflowsManagement:library:enabled';

const PANEL_ID = WORKFLOWS_APP_ID;

type DeepLinkId = typeof WORKFLOWS_APP_ID | `${typeof WORKFLOWS_APP_ID}:${WorkflowsPageNameType}`;

const workflowsDeepLink = (page: WorkflowsPageNameType): DeepLinkId =>
  `${WORKFLOWS_APP_ID}:${page}`;

/**
 * Minimal `CoreStart` shape for nav gating. Satisfied by `CoreStart` at call sites.
 *
 * Intentionally structural (no import from `@kbn/core-*`) to avoid a dependency cycle:
 * `@kbn/core-chrome-browser` already imports this package for `AppDeepLinkId` typing.
 */
export interface WorkflowsNavPanelCore {
  settings: {
    globalClient: {
      get: <T>(key: string, defaultValue: T) => T;
    };
  };
}

type WorkflowsNavNode =
  | { link: typeof WORKFLOWS_APP_ID }
  | {
      id: typeof PANEL_ID;
      link: typeof WORKFLOWS_APP_ID;
      renderAs: 'panelOpener';
      children: [
        {
          breadcrumbStatus: 'hidden';
          children: [{ link: DeepLinkId }, { link: DeepLinkId }];
        }
      ];
    };

/**
 * Returns Workflows side-nav entries for solution navigation trees.
 *
 * When the Workflow Template Library tech preview is enabled, returns a panel
 * opener with list and library children. Otherwise returns a single direct link.
 *
 * ```ts
 * ...getWorkflowsNavPanel(core),
 * ```
 */
export const getWorkflowsNavPanel = (core: WorkflowsNavPanelCore): WorkflowsNavNode[] => {
  const libraryEnabled = core.settings.globalClient.get<boolean>(
    WORKFLOWS_LIBRARY_ENABLED_SETTING_ID,
    false
  );

  if (!libraryEnabled) {
    return [{ link: WORKFLOWS_APP_ID }];
  }

  return [
    {
      id: PANEL_ID,
      link: WORKFLOWS_APP_ID,
      renderAs: 'panelOpener',
      children: [
        {
          breadcrumbStatus: 'hidden',
          children: [
            { link: workflowsDeepLink(WorkflowsPageName.workflows) },
            { link: workflowsDeepLink(WorkflowsPageName.library) },
          ],
        },
      ],
    },
  ];
};
