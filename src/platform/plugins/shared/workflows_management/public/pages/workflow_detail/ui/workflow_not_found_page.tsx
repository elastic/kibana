/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { i18n } from '@kbn/i18n';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';

const backToWorkflowsLabel = i18n.translate('workflows.workflowDetail.notFound.action', {
  defaultMessage: 'Back to Workflows',
});

export interface WorkflowNotFoundPageProps {
  onBackToWorkflows: () => void;
}

export const WorkflowNotFoundPage = ({ onBackToWorkflows }: WorkflowNotFoundPageProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={[
        kbnFullBodyHeightCss(),
        css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: euiTheme.colors.emptyShade,
        }),
      ]}
      data-test-subj="workflow-not-found-page"
    >
      <NotFoundPrompt
        title={i18n.translate('workflows.workflowDetail.notFound.title', {
          defaultMessage: 'Workflow not found',
        })}
        body={i18n.translate('workflows.workflowDetail.notFound.body', {
          defaultMessage:
            "Sorry, the workflow you're looking for can't be found. It might have been removed or renamed, or maybe it never existed at all.",
        })}
        actions={
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            flush="both"
            onClick={onBackToWorkflows}
            aria-label={backToWorkflowsLabel}
            data-test-subj="workflowDetailBackToWorkflowsButton"
          >
            {backToWorkflowsLabel}
          </EuiButtonEmpty>
        }
      />
    </div>
  );
};
