/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageTemplate } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { CatalogBrowser, useLibraryEnabled } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsPageName } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const libraryPageTitle = i18n.translate('workflowsManagement.libraryPage.pageTitle', {
  defaultMessage: 'Template Library',
});

const experimentalBadgeLabel = i18n.translate('workflowsManagement.libraryPage.experimentalBadge', {
  defaultMessage: 'Experimental',
});

const contributeLinkLabel = i18n.translate('workflowsManagement.libraryPage.contributeLink', {
  defaultMessage: 'Contribute a template',
});

// The Workflow Template Library ships from `elastic/workflows`; the header
// link takes users to the repo home so they can orient themselves before
// opening an issue or PR (per Tinsae's feedback on the PR).
const CONTRIBUTE_TEMPLATE_URL = 'https://github.com/elastic/workflows';

/**
 * Workflow Template Library catalog page (`/app/workflows/library`). The
 * browse UI itself lives in `@kbn/workflows-ui` (`<CatalogBrowser>`) so it can
 * be reused from other plugins later; this page only wires navigation. The
 * route is always registered (see `routes.tsx`); this page redirects to the
 * workflows list when the library is disabled.
 */
export const LibraryCatalogBrowserPage = React.memo(() => {
  const { application } = useKibana().services;

  useWorkflowsBreadcrumbs(libraryPageTitle);

  const headerBadges = useMemo<AppHeaderBadge[]>(
    () => [
      {
        label: experimentalBadgeLabel,
        color: 'hollow',
        'data-test-subj': 'workflowLibraryExperimentalBadge',
      },
    ],
    []
  );

  const headerMenu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'contributeTemplate',
          order: 1,
          label: contributeLinkLabel,
          iconType: 'logoGithub',
          href: CONTRIBUTE_TEMPLATE_URL,
          target: '_blank',
          testId: 'workflowLibraryContributeLink',
        },
      ],
    }),
    []
  );

  const handleSelect = useCallback(
    (template: Template) => {
      application.navigateToApp(PLUGIN_ID, {
        deepLinkId: WorkflowsPageName.library,
        path: template.slug,
      });
    },
    [application]
  );

  // The library is a tech preview gated behind a global uiSetting
  // This will be removed once the library is fully released
  const isLibraryEnabled = useLibraryEnabled();
  if (!isLibraryEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <EuiPageTemplate
      offset={0}
      data-test-subj="workflowLibraryCatalogBrowserPage"
      restrictWidth={false}
    >
      <AppHeader title={libraryPageTitle} badges={headerBadges} menu={headerMenu} />
      <EuiPageTemplate.Section paddingSize="m" grow>
        <CatalogBrowser onSelect={handleSelect} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
});
LibraryCatalogBrowserPage.displayName = 'LibraryCatalogBrowserPage';
