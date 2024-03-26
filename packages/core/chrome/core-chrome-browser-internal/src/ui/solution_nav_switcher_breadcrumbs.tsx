/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiListGroup, EuiListGroupItem, EuiTitle, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ChromeProjectBreadcrumb,
  SolutionNavigationDefinitions,
  CloudLinks,
} from '@kbn/core-chrome-browser';

export const getSolutionNavSwitcherBreadCrumb = ({
  definitions,
  activeId,
  onChange,
  cloudLinks,
}: {
  definitions: SolutionNavigationDefinitions;
  activeId: string;
  onChange: (id: string, options?: { redirect?: boolean }) => void;
  cloudLinks: CloudLinks;
}): ChromeProjectBreadcrumb => {
  const text = Object.values(definitions).find(({ id }) => id === activeId)?.title;
  return {
    text,
    'data-test-subj': 'solutionNavSwitcher',
    popoverContent: (closePopover) => (
      <>
        <EuiTitle size="xxxs">
          <h3>
            {i18n.translate('core.ui.primaryNav.cloud.breadCrumbDropdown.title', {
              defaultMessage: 'Solution view',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiListGroup bordered size="s">
          {Object.values(definitions).map(({ id, title, icon = 'gear' }) => [
            <EuiListGroupItem
              key={id}
              label={title}
              isActive={id === activeId}
              iconType={icon as string}
              data-test-subj={`solutionNavSwitcher-${id}`}
              onClick={() => {
                onChange(id, { redirect: true });
                closePopover();
              }}
            />,
          ])}
        </EuiListGroup>

        <EuiSpacer size="s" />

        {cloudLinks.deployment && (
          <EuiButtonEmpty
            href={cloudLinks.deployment.href}
            color="text"
            iconType="gear"
            data-test-subj="manageDeploymentBtn"
          >
            {i18n.translate('core.ui.primaryNav.cloud.breadCrumbDropdown.manageDeploymentLabel', {
              defaultMessage: 'Manage this deployment',
            })}
          </EuiButtonEmpty>
        )}

        {cloudLinks.deployments && (
          <EuiButtonEmpty
            href={cloudLinks.deployments.href}
            color="text"
            iconType="spaces"
            data-test-subj="viewDeploymentsBtn"
          >
            {cloudLinks.deployments.title}
          </EuiButtonEmpty>
        )}
      </>
    ),
    popoverProps: {
      panelPaddingSize: 'm',
      zIndex: 6000,
      panelStyle: { width: 260 },
      panelProps: {
        'data-test-subj': 'solutionNavSwitcherPanel',
      },
    },
  };
};
