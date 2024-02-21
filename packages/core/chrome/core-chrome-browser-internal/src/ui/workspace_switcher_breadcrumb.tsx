/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiListGroup, EuiListGroupItem, EuiTitle, EuiSpacer, EuiLink } from '@elastic/eui';
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
    text: i18n.translate('core.ui.primaryNav.cloud.workflowLabel', {
      defaultMessage: 'My Kibana deployment',
    }),
    popoverContent: (
      <>
        <EuiTitle size="xxs">
          <h3>Solution view</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiListGroup bordered size="s">
          {Object.values(workflows).map(({ id, title, icon = 'gear' }) => [
            <EuiListGroupItem
              key={id}
              label={title}
              iconType={icon as string}
              onClick={() => {
                onWorkflowChange(id);
              }}
            />,
          ])}
        </EuiListGroup>
        <EuiSpacer size="m" />
        <EuiLink href="">View all deployments</EuiLink>
      </>
    ),
    popoverProps: { panelPaddingSize: 'm', zIndex: 6000 },
  };
};
