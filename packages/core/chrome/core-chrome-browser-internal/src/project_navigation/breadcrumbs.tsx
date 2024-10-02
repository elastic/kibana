/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiContextMenuPanel, EuiContextMenuItem, EuiButtonEmpty } from '@elastic/eui';
import type {
  AppDeepLinkId,
  ChromeProjectBreadcrumb,
  ChromeProjectNavigationNode,
  ChromeSetProjectBreadcrumbsParams,
  ChromeBreadcrumb,
  CloudLinks,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export function buildBreadcrumbs({
  projectName,
  cloudLinks,
  projectBreadcrumbs,
  activeNodes,
  chromeBreadcrumbs,
  isServerless,
}: {
  projectName?: string;
  projectBreadcrumbs: {
    breadcrumbs: ChromeProjectBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  };
  chromeBreadcrumbs: ChromeBreadcrumb[];
  cloudLinks: CloudLinks;
  activeNodes: ChromeProjectNavigationNode[][];
  isServerless: boolean;
}): ChromeProjectBreadcrumb[] {
  const rootCrumb = buildRootCrumb({
    projectName,
    cloudLinks,
    isServerless,
  });

  if (projectBreadcrumbs.params.absolute) {
    return [rootCrumb, ...projectBreadcrumbs.breadcrumbs];
  }

  // breadcrumbs take the first active path
  const activePath: ChromeProjectNavigationNode[] = activeNodes[0] ?? [];
  const navBreadcrumbPath = activePath.filter(
    (n) => Boolean(n.title) && n.breadcrumbStatus !== 'hidden'
  );
  const navBreadcrumbs = navBreadcrumbPath.map(
    (node): ChromeProjectBreadcrumb => ({
      href: node.deepLink?.url ?? node.href,
      deepLinkId: node.deepLink?.id as AppDeepLinkId,
      text: node.title,
    })
  );

  // if there are project breadcrumbs set, use them
  if (projectBreadcrumbs.breadcrumbs.length !== 0) {
    return [rootCrumb, ...navBreadcrumbs, ...projectBreadcrumbs.breadcrumbs];
  }

  // otherwise try to merge legacy breadcrumbs with navigational project breadcrumbs using deeplinkid
  let chromeBreadcrumbStartIndex = -1;
  let navBreadcrumbEndIndex = -1;
  navBreadcrumbsLoop: for (let i = navBreadcrumbs.length - 1; i >= 0; i--) {
    if (!navBreadcrumbs[i].deepLinkId) continue;
    for (let j = 0; j < chromeBreadcrumbs.length; j++) {
      if (chromeBreadcrumbs[j].deepLinkId === navBreadcrumbs[i].deepLinkId) {
        chromeBreadcrumbStartIndex = j;
        navBreadcrumbEndIndex = i;
        break navBreadcrumbsLoop;
      }
    }
  }

  if (chromeBreadcrumbStartIndex === -1) {
    return [rootCrumb, ...navBreadcrumbs];
  } else {
    return [
      rootCrumb,
      ...navBreadcrumbs.slice(0, navBreadcrumbEndIndex),
      ...chromeBreadcrumbs.slice(chromeBreadcrumbStartIndex),
    ];
  }
}

function buildRootCrumb({
  projectName,
  cloudLinks,
  isServerless,
}: {
  projectName?: string;
  cloudLinks: CloudLinks;
  isServerless: boolean;
}): ChromeProjectBreadcrumb {
  if (isServerless) {
    return {
      text:
        projectName ??
        i18n.translate('core.ui.primaryNav.cloud.projectLabel', {
          defaultMessage: 'Project',
        }),
      // increase the max-width of the root breadcrumb to not truncate too soon
      style: { maxWidth: '320px' },
      popoverContent: (
        <EuiContextMenuPanel
          size="s"
          items={[
            <EuiContextMenuItem key="project" href={cloudLinks.deployment?.href} icon={'gear'}>
              <FormattedMessage
                id="core.ui.primaryNav.cloud.linkToProject"
                defaultMessage="Manage project"
              />
            </EuiContextMenuItem>,
            <EuiContextMenuItem key="projects" href={cloudLinks.projects?.href} icon={'grid'}>
              <FormattedMessage
                id="core.ui.primaryNav.cloud.linkToAllProjects"
                defaultMessage="View all projects"
              />
            </EuiContextMenuItem>,
          ]}
        />
      ),
      popoverProps: { panelPaddingSize: 'none' },
    };
  }

  return {
    text: i18n.translate('core.ui.primaryNav.cloud.deploymentLabel', {
      defaultMessage: 'Deployment',
    }),
    'data-test-subj': 'deploymentCrumb',
    popoverContent: () => (
      <>
        {cloudLinks.deployment && (
          <EuiButtonEmpty
            href={cloudLinks.deployment.href}
            color="text"
            iconType="gear"
            data-test-subj="manageDeploymentBtn"
            size="s"
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
            size="s"
          >
            {cloudLinks.deployments.title}
          </EuiButtonEmpty>
        )}
      </>
    ),
    popoverProps: {
      panelPaddingSize: 's',
      zIndex: 6000,
      panelStyle: { maxWidth: 240 },
      panelProps: {
        'data-test-subj': 'deploymentLinksPanel',
      },
    },
  };
}
