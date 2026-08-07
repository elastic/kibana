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
const WORKFLOWS_EXECUTIONS_VIEW_ENABLED_SETTING_ID =
  'workflowsManagement:globalExecutionsView:enabled';

const createCore = ({
  libraryEnabled = false,
  executionsViewEnabled = false,
} = {}): WorkflowsNavPanelCore => ({
  settings: {
    globalClient: {
      get: <T>(key: string, defaultValue: T) => {
        if (key === WORKFLOWS_LIBRARY_ENABLED_SETTING_ID) return libraryEnabled as T;
        if (key === WORKFLOWS_EXECUTIONS_VIEW_ENABLED_SETTING_ID) return executionsViewEnabled as T;
        return defaultValue;
      },
    },
  },
});

describe('getWorkflowsNavPanel', () => {
  it('returns a single workflows link when both features are disabled', () => {
    expect(getWorkflowsNavPanel(createCore())).toEqual([{ link: WORKFLOWS_APP_ID }]);
  });

  it('returns a panel opener with list and library children when only library is enabled', () => {
    expect(getWorkflowsNavPanel(createCore({ libraryEnabled: true }))).toEqual([
      {
        id: WORKFLOWS_APP_ID,
        link: WORKFLOWS_APP_ID,
        renderAs: 'panelOpener',
        children: [
          { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.list}`, breadcrumbStatus: 'hidden' },
          { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.library}`, breadcrumbStatus: 'hidden' },
        ],
      },
    ]);
  });

  it('returns a panel opener with list and executions children when only executions view is enabled', () => {
    expect(getWorkflowsNavPanel(createCore({ executionsViewEnabled: true }))).toEqual([
      {
        id: WORKFLOWS_APP_ID,
        link: WORKFLOWS_APP_ID,
        renderAs: 'panelOpener',
        children: [
          { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.list}`, breadcrumbStatus: 'hidden' },
          {
            link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.executions}`,
            breadcrumbStatus: 'hidden',
          },
        ],
      },
    ]);
  });

  it('returns a panel opener with list, executions, and library children when both are enabled', () => {
    expect(
      getWorkflowsNavPanel(createCore({ libraryEnabled: true, executionsViewEnabled: true }))
    ).toEqual([
      {
        id: WORKFLOWS_APP_ID,
        link: WORKFLOWS_APP_ID,
        renderAs: 'panelOpener',
        children: [
          { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.list}`, breadcrumbStatus: 'hidden' },
          {
            link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.executions}`,
            breadcrumbStatus: 'hidden',
          },
          { link: `${WORKFLOWS_APP_ID}:${WorkflowsPageName.library}`, breadcrumbStatus: 'hidden' },
        ],
      },
    ]);
  });
});
