/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeProjectBreadcrumb, Workflows } from '@kbn/core-chrome-browser';

export const getWorkspaceSwitcherBreadCrumb = ({
  workflows,
  onWorkflowChange,
}: {
  onWorkflowChange: (id: string) => void;
  workflows: Workflows;
}): ChromeProjectBreadcrumb => {
  return {
    text: i18n.translate('core.ui.primaryNav.cloud.projectLabel', {
      defaultMessage: 'Workflow',
    }),
    popoverContent: (
      <EuiContextMenuPanel
        size="s"
        items={Object.values(workflows).map(({ id, title, icon = 'gear' }) => (
          <EuiContextMenuItem
            key={id}
            icon={icon as string}
            onClick={() => {
              onWorkflowChange(id);
            }}
          >
            {title}
          </EuiContextMenuItem>
        ))}
      />
    ),
    popoverProps: { panelPaddingSize: 'none' },
  };
};
