/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import type { TemplateBody } from '@kbn/workflows-library';
import { TemplateDetail, useLibraryEnabled } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsDeepLinks } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import { useSetWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const libraryBreadcrumbLabel = i18n.translate(
  'workflowsManagement.libraryTemplatePage.libraryBreadcrumb',
  { defaultMessage: 'Library' }
);

const backToLibraryLabel = i18n.translate('workflowsManagement.libraryTemplatePage.backToLibrary', {
  defaultMessage: 'Back to library',
});

type LibraryTemplateDetailPageProps = RouteComponentProps<{ slug: string }>;

/**
 * Workflow Template Library template detail page (`/app/workflows/library/:slug`).
 * Fills the available height like the workflow editor so the read-only preview
 * grows with the viewport. The route is only registered when the library is
 * enabled (see `routes.tsx`).
 */
export const LibraryTemplateDetailPage = React.memo<LibraryTemplateDetailPageProps>(({ match }) => {
  const slug = match.params.slug;
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const setBreadcrumbs = useSetWorkflowsBreadcrumbs();

  const goToLibrary = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { deepLinkId: WorkflowsDeepLinks.library });
  }, [application]);

  const libraryBreadcrumb = useMemo<ChromeBreadcrumb>(
    () => ({
      text: libraryBreadcrumbLabel,
      href: application.getUrlForApp(PLUGIN_ID, { deepLinkId: WorkflowsDeepLinks.library }),
      onClick: (event) => {
        if (event) {
          event.preventDefault();
        }
        goToLibrary();
      },
    }),
    [application, goToLibrary]
  );

  // Set the "Library" crumb up front; append the template name once it loads.
  useEffect(() => {
    setBreadcrumbs([libraryBreadcrumb]);
  }, [setBreadcrumbs, libraryBreadcrumb]);

  const handleLoaded = useCallback(
    (template: TemplateBody) => {
      setBreadcrumbs([libraryBreadcrumb, { text: template.metadata.name }]);
    },
    [setBreadcrumbs, libraryBreadcrumb]
  );

  // The library is a tech preview gated behind a global uiSetting
  // This will be removed once the library is fully released
  const isLibraryEnabled = useLibraryEnabled();
  if (!isLibraryEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      alignItems="flexStart"
      css={kbnFullBodyHeightCss()}
      data-test-subj="workflowLibraryTemplateDetailPage"
    >
      <EuiFlexItem grow={false} css={css({ padding: `${euiTheme.size.l} ${euiTheme.size.l} 0` })}>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="arrowLeft"
          onClick={goToLibrary}
          data-test-subj="workflowLibraryTemplateDetailBackButton"
        >
          {backToLibraryLabel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem
        css={css({
          minHeight: 0,
          overflow: 'hidden',
          padding: `${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.l}`,
          width: '100%',
        })}
      >
        <TemplateDetail slug={slug} onLoaded={handleLoaded} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
LibraryTemplateDetailPage.displayName = 'LibraryTemplateDetailPage';
