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
} from '@kbn/core-chrome-browser';

export const getSolutionNavSwitcherBreadCrumb = ({
  definitions,
  activeId,
  onChange,
  allDeploymentsUrl,
  deploymentUrl,
}: {
  definitions: SolutionNavigationDefinitions;
  activeId: string;
  onChange: (id: string) => void;
  allDeploymentsUrl: string;
  deploymentUrl: string;
}): ChromeProjectBreadcrumb => {

  return {
    text: i18n.translate('core.ui.primaryNav.cloud.breadCrumbDropdown.myDeploymentLabel', {
      defaultMessage: 'My deployment',
    }),
    popoverContent: (
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
              iconType={icon as string}
              onClick={() => {
                onChange(id);
              }}
            />,
          ])}
        </EuiListGroup>
        <EuiSpacer size="s" />

        <EuiButtonEmpty href={deploymentUrl} color="text" iconType="gear">
          {i18n.translate('core.ui.primaryNav.cloud.breadCrumbDropdown.manageDeploymentLabel', {
            defaultMessage: 'Manage this deployment',
          })}
        </EuiButtonEmpty>

        <EuiButtonEmpty href={allDeploymentsUrl} color="text" iconType="spaces">
          {i18n.translate('core.ui.primaryNav.cloud.breadCrumbDropdown.viewAllDeploymentsLabel', {
            defaultMessage: 'View all deployments',
          })}
        </EuiButtonEmpty>
      </>
    ),
    popoverProps: { panelPaddingSize: 'm', zIndex: 6000, panelStyle: { width: 260 } },
  };
};
