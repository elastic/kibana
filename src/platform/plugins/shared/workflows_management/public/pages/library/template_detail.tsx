/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { TemplateDetail, useLibraryEnabled } from '@kbn/workflows-ui';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const libraryPageTitle = i18n.translate('workflowsManagement.libraryTemplatePage.pageTitle', {
  defaultMessage: 'Library template',
});

type LibraryTemplateDetailPageProps = RouteComponentProps<{ slug: string }>;

/**
 * Workflow Template Library template detail page (`/app/workflows/library/:slug`).
 * Currently a placeholder — the read-only YAML preview and install flow land in
 * a follow-up session (see `TemplateDetail`'s TODO in `@kbn/workflows-ui`). The
 * route is always registered (see `routes.tsx`); this page redirects to the
 * workflows list when the library is disabled.
 */
export const LibraryTemplateDetailPage = React.memo<LibraryTemplateDetailPageProps>(({ match }) => {
  const slug = match.params.slug;
  useWorkflowsBreadcrumbs(libraryPageTitle);

  // The library is a tech preview gated behind a global uiSetting
  // This will be removed once the library is fully released
  const isLibraryEnabled = useLibraryEnabled();
  if (!isLibraryEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <EuiPageTemplate offset={0} data-test-subj="workflowLibraryTemplateDetailPage">
      <EuiPageTemplate.Section paddingSize="m" grow>
        <TemplateDetail slug={slug} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
});
LibraryTemplateDetailPage.displayName = 'LibraryTemplateDetailPage';
