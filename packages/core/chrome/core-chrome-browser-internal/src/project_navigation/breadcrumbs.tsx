/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import {
  AppDeepLinkId,
  ChromeProjectBreadcrumb,
  ChromeProjectNavigationNode,
  ChromeSetProjectBreadcrumbsParams,
  ChromeBreadcrumb,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function buildBreadcrumbs({
  projectsUrl,
  projectName,
  projectUrl,
  projectBreadcrumbs,
  activeNodes,
  chromeBreadcrumbs,
}: {
  projectsUrl?: string;
  projectName?: string;
  projectUrl?: string;
  projectBreadcrumbs: {
    breadcrumbs: ChromeProjectBreadcrumb[];
    params: ChromeSetProjectBreadcrumbsParams;
  };
  chromeBreadcrumbs: ChromeBreadcrumb[];
  activeNodes: ChromeProjectNavigationNode[][];
}): ChromeProjectBreadcrumb[] {
  const rootCrumb = buildRootCrumb({ projectsUrl, projectName, projectUrl });

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
  projectsUrl,
  projectName,
  projectUrl,
}: {
  projectsUrl?: string;
  projectName?: string;
  projectUrl?: string;
}): ChromeProjectBreadcrumb {
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
          <EuiContextMenuItem key="project" href={projectUrl} icon={'gear'}>
            <FormattedMessage
              id="core.ui.primaryNav.cloud.linkToProject"
              defaultMessage="Manage project"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem key="projects" href={projectsUrl} icon={'grid'}>
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
