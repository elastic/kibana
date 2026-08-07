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
import { Redirect, useLocation } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import { parseTemplateYaml } from '@kbn/workflows-library';
import type { WorkflowsImportRouteState } from '@kbn/workflows-ui';
import { TemplateDetail, useLibraryEnabled } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsPageName } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import { useSetWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { useWorkflowsExperimentalUiSetting } from '../../hooks/use_workflows_experimental_ui_setting';

const libraryBreadcrumbLabel = i18n.translate(
  'workflowsManagement.libraryImportPage.libraryBreadcrumb',
  { defaultMessage: 'Template Library' }
);

const backToLibraryLabel = i18n.translate('workflowsManagement.libraryImportPage.backToLibrary', {
  defaultMessage: 'Back to library',
});

/**
 * Workflow Template Library import page (`/app/workflows/library/import`).
 * Renders the same setup/install experience as the detail page, but for a
 * template supplied client-side (an uploaded file) rather than a catalog slug.
 * The raw YAML travels on history state (`WorkflowsImportRouteState`), so a
 * reload with no state falls back to the catalog.
 */
export const LibraryTemplateImportPage = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const setWorkflowsBreadcrumbs = useSetWorkflowsBreadcrumbs();
  const showGraphPreview = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID
  );

  const location = useLocation<WorkflowsImportRouteState | undefined>();
  const customTemplateYaml = location.state?.customTemplateYaml;

  // The file was already validated in the upload modal; parse again here to
  // build the template object (and to guard against a tampered history entry).
  const template = useMemo(() => {
    if (!customTemplateYaml) return undefined;
    try {
      return parseTemplateYaml(customTemplateYaml, { lenient: true });
    } catch {
      return undefined;
    }
  }, [customTemplateYaml]);

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

  const breadcrumbs = useMemo<ChromeBreadcrumb[]>(
    () => (template ? [libraryBreadcrumb, { text: template.metadata.name }] : [libraryBreadcrumb]),
    [libraryBreadcrumb, template]
  );

  useEffect(() => {
    setWorkflowsBreadcrumbs(breadcrumbs);
  }, [setWorkflowsBreadcrumbs, breadcrumbs]);

  // The library is a tech preview gated behind a global uiSetting
  // This will be removed once the library is fully released
  const isLibraryEnabled = useLibraryEnabled();
  if (!isLibraryEnabled) {
    return <Redirect to="/" />;
  }

  // No template on history state (e.g. a direct navigation or reload) — send
  // the user back to the catalog to pick or upload a template.
  if (!template) {
    return <Redirect to="/library" />;
  }

  const backButton = (
    <EuiButtonEmpty
      size="xs"
      flush="left"
      iconType="arrowLeft"
      onClick={goToLibrary}
      data-test-subj="workflowLibraryTemplateImportBackButton"
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
      data-test-subj="workflowLibraryTemplateImportPage"
    >
      <EuiFlexItem
        css={css({
          minHeight: 0,
          overflow: 'hidden',
          padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.l}`,
          width: '100%',
        })}
      >
        <TemplateDetail
          template={template}
          installMode="custom"
          showGraphPreview={showGraphPreview}
          backButton={backButton}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
LibraryTemplateImportPage.displayName = 'LibraryTemplateImportPage';
