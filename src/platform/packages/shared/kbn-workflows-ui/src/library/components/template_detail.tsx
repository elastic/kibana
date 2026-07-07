/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiDescriptionList,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTemplate } from '../hooks/use_template';

export interface TemplateDetailProps {
  slug: string;
}

/**
 * Placeholder template detail view.
 *
 * TODO (follow-up session): render a read-only preview of the template YAML
 * using the existing workflow Monaco editor (`YamlEditor` +
 * `WORKFLOW_READ_ONLY_MONACO_OPTIONS` from
 * `workflows_management/public/shared/ui` and
 * `workflows_management/public/widgets/workflow_yaml_editor/lib/workflow_monaco_layout_options`),
 * the install-form preview, and the Install CTA.
 */
export const TemplateDetail = React.memo<TemplateDetailProps>(({ slug }) => {
  const { data, isLoading, isError } = useTemplate(slug);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="workflowLibraryTemplateDetail-loading" />;
  }

  if (isError || !data) {
    return (
      <EuiCallOut
        data-test-subj="workflowLibraryTemplateDetail-error"
        color="danger"
        iconType="warning"
        title={i18n.translate('workflows.library.templateDetail.errorTitle', {
          defaultMessage: 'Unable to load this template',
        })}
        announceOnMount
      />
    );
  }

  const { metadata } = data;

  return (
    <div data-test-subj="workflowLibraryTemplateDetail">
      <EuiTitle size="m">
        <h1>{metadata.name}</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <p>{metadata.description}</p>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        compressed
        listItems={[
          {
            title: i18n.translate('workflows.library.templateDetail.slugLabel', {
              defaultMessage: 'Slug',
            }),
            description: metadata.slug,
          },
          {
            title: i18n.translate('workflows.library.templateDetail.versionLabel', {
              defaultMessage: 'Version',
            }),
            description: metadata.version,
          },
          {
            title: i18n.translate('workflows.library.templateDetail.categoriesLabel', {
              defaultMessage: 'Categories',
            }),
            description: metadata.categories.join(', '),
          },
        ]}
      />
      <EuiSpacer size="l" />
      <EuiCallOut
        data-test-subj="workflowLibraryTemplateDetail-previewPlaceholder"
        iconType="iInCircle"
        title={i18n.translate('workflows.library.templateDetail.previewPlaceholderTitle', {
          defaultMessage: 'Preview coming soon',
        })}
      >
        {i18n.translate('workflows.library.templateDetail.previewPlaceholderBody', {
          defaultMessage:
            "A read-only preview of this template's YAML, plus the install flow, will be added in a follow-up.",
        })}
      </EuiCallOut>
    </div>
  );
});
TemplateDetail.displayName = 'TemplateDetail';
