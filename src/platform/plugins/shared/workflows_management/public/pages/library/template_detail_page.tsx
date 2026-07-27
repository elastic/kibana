/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import type { TemplateBody } from '@kbn/workflows-library';
import { TemplateDetail, useLibraryEnabled, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsPageName } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import { useSetWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowsExperimentalUiSetting } from '../../hooks/use_workflows_experimental_ui_setting';
import { FROM_TEMPLATE_QUERY_PARAM } from '../../shared/utils/template_prefill';

const libraryBreadcrumbLabel = i18n.translate(
  'workflowsManagement.libraryTemplatePage.libraryBreadcrumb',
  { defaultMessage: 'Template Library' }
);

const backToLibraryLabel = i18n.translate('workflowsManagement.libraryTemplatePage.backToLibrary', {
  defaultMessage: 'Back to library',
});

const addWorkflowLabel = i18n.translate('workflowsManagement.libraryTemplatePage.addWorkflow', {
  defaultMessage: 'Add workflow',
});

type LibraryTemplateDetailPageProps = RouteComponentProps<{ slug: string }>;

interface TemplateBreadcrumb {
  readonly slug: string;
  readonly name: string;
}

/**
 * Workflow Template Library template detail page (`/app/workflows/library/:slug`).
 * Fills the available height like the workflow editor so the read-only preview
 * grows with the viewport. The route is always registered (see `routes.tsx`);
 * this page redirects to the workflows list when the library is disabled.
 */
export const LibraryTemplateDetailPage = React.memo<LibraryTemplateDetailPageProps>(({ match }) => {
  const slug = match.params.slug;
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const setWorkflowsBreadcrumbs = useSetWorkflowsBreadcrumbs();
  const showGraphPreview = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID
  );
  // Same capability gate the workflow list uses for its Create/Clone actions —
  // users without workflow-create privileges shouldn't see the "Add workflow"
  // CTA because they can't save the resulting draft.
  const { canCreateWorkflow } = useWorkflowsCapabilities();

  const goToLibrary = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { deepLinkId: WorkflowsPageName.library });
  }, [application]);

  const libraryBreadcrumb = useMemo<ChromeBreadcrumb>(
    () => ({
      text: libraryBreadcrumbLabel,
      href: application.getUrlForApp(PLUGIN_ID, { deepLinkId: WorkflowsPageName.library }),
      onClick: (event) => {
        if (event) {
          event.preventDefault();
        }
        goToLibrary();
      },
    }),
    [application, goToLibrary]
  );

  const [templateBreadcrumb, setTemplateBreadcrumb] = useState<TemplateBreadcrumb | undefined>();
  const [loadedTemplate, setLoadedTemplate] = useState<TemplateBody | undefined>();
  const handleTemplateLoaded = useCallback((template: TemplateBody) => {
    setTemplateBreadcrumb({ slug: template.metadata.slug, name: template.metadata.name });
    setLoadedTemplate(template);
  }, []);

  const handleAddWorkflow = useCallback(() => {
    if (!loadedTemplate) return;
    // The create page loads the template by its stable slug, so the link
    // survives refreshes and can be shared.
    const templateSlug = encodeURIComponent(loadedTemplate.metadata.slug);
    void application.navigateToApp(PLUGIN_ID, {
      path: `/create?${FROM_TEMPLATE_QUERY_PARAM}=${templateSlug}`,
    });
  }, [application, loadedTemplate]);

  const breadcrumbs = useMemo<ChromeBreadcrumb[]>(() => {
    if (templateBreadcrumb?.slug === slug) {
      return [libraryBreadcrumb, { text: templateBreadcrumb.name }];
    }
    return [libraryBreadcrumb];
  }, [libraryBreadcrumb, slug, templateBreadcrumb]);

  // Set the workflows breadcrumbs on every change
  useEffect(() => {
    setWorkflowsBreadcrumbs(breadcrumbs);
  }, [setWorkflowsBreadcrumbs, breadcrumbs]);

  // The library is a tech preview gated behind a global uiSetting
  // This will be removed once the library is fully released
  const isLibraryEnabled = useLibraryEnabled();
  if (!isLibraryEnabled) {
    return <Redirect to="/" />;
  }

  const backButton = (
    <EuiButtonEmpty
      size="xs"
      flush="left"
      iconType="arrowLeft"
      onClick={goToLibrary}
      data-test-subj="workflowLibraryTemplateDetailBackButton"
    >
      {backToLibraryLabel}
    </EuiButtonEmpty>
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      // Full-height pages (like the workflow editor) don't use EuiPageTemplate
      css={[kbnFullBodyHeightCss(), css({ backgroundColor: euiTheme.colors.backgroundBasePlain })]}
      data-test-subj="workflowLibraryTemplateDetailPage"
    >
      <EuiFlexItem
        css={css({
          minHeight: 0,
          overflow: 'hidden',
          // 8px around the preview panel (top/right/bottom); wider on the left for
          // the metadata column. The panel fills the height and scrolls internally.
          padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.l}`,
          width: '100%',
        })}
      >
        <TemplateDetail
          slug={slug}
          onLoaded={handleTemplateLoaded}
          showGraphPreview={showGraphPreview}
          backButton={backButton}
          primaryAction={
            loadedTemplate && canCreateWorkflow ? (
              <EuiButton
                fill
                fullWidth
                onClick={handleAddWorkflow}
                data-test-subj="workflowLibraryTemplateDetailAddWorkflowButton"
              >
                {addWorkflowLabel}
              </EuiButton>
            ) : null
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
LibraryTemplateDetailPage.displayName = 'LibraryTemplateDetailPage';
