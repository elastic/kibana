/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from '@elastic/eui';
import React, { useCallback } from 'react';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { CatalogBrowser, useLibraryEnabled } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsDeepLinks } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const libraryPageTitle = i18n.translate('workflowsManagement.libraryPage.pageTitle', {
  defaultMessage: 'Library',
});

const experimentalBadgeLabel = i18n.translate('workflowsManagement.libraryPage.experimentalBadge', {
  defaultMessage: 'Experimental',
});

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

  const handleSelect = useCallback(
    (template: Template) => {
      application.navigateToApp(PLUGIN_ID, {
        deepLinkId: WorkflowsDeepLinks.library,
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
      <EuiPageTemplate.Header
        bottomBorder
        pageTitle={
          <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="flexStart">
            <EuiFlexItem grow={false}>{libraryPageTitle}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                iconType="flask"
                data-test-subj="workflowLibraryExperimentalBadge"
              >
                {experimentalBadgeLabel}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <EuiPageTemplate.Section paddingSize="m" grow>
        <CatalogBrowser onSelect={handleSelect} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
});
LibraryCatalogBrowserPage.displayName = 'LibraryCatalogBrowserPage';
