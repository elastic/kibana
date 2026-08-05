/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_APP_ID } from './constants';
import { WorkflowsPageName } from './deep_links';
import { getWorkflowsNavPanel, type WorkflowsNavPanelCore } from './get_workflows_nav_panel';

const WORKFLOWS_LIBRARY_ENABLED_SETTING_ID = 'workflowsManagement:library:enabled';

const createCore = (libraryEnabled: boolean): WorkflowsNavPanelCore => ({
  settings: {
    globalClient: {
      get: <T>(key: string, defaultValue: T) =>
        key === WORKFLOWS_LIBRARY_ENABLED_SETTING_ID ? (libraryEnabled as T) : defaultValue,
    },
  },
});

describe('getWorkflowsNavPanel', () => {
  it('returns a single workflows link when the library is disabled', () => {
    expect(getWorkflowsNavPanel(createCore(false))).toEqual([{ link: WORKFLOWS_APP_ID }]);
  });

  it('returns a panel opener with list and library children when the library is enabled', () => {
    expect(getWorkflowsNavPanel(createCore(true))).toEqual([
      {
        id: WORKFLOWS_APP_ID,
        link: WORKFLOWS_APP_ID,
        renderAs: 'panelOpener',
        children: [
          {
            breadcrumbStatus: 'hidden',
            children: [
              { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.workflows}` },
              { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.library}` },
            ],
          },
        ],
      },
    ]);
  });
});
