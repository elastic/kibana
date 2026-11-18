/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { NotFoundPage } from '../../../components/not_found_page';

export interface WorkflowNotFoundPageProps {
  onBackToWorkflows: () => void;
}

export const WorkflowNotFoundPage = ({ onBackToWorkflows }: WorkflowNotFoundPageProps) => (
  <NotFoundPage
    title={i18n.translate('workflows.workflowDetail.notFound.title', {
      defaultMessage: 'Workflow not found',
    })}
    body={i18n.translate('workflows.workflowDetail.notFound.body', {
      defaultMessage:
        "Sorry, the workflow you're looking for can't be found. It might have been removed or renamed, or maybe it never existed at all.",
    })}
    backLabel={i18n.translate('workflows.workflowDetail.notFound.action', {
      defaultMessage: 'Back to Workflows',
    })}
    onBack={onBackToWorkflows}
    data-test-subj="workflow-not-found-page"
    backButtonDataTestSubj="workflowDetailBackToWorkflowsButton"
  />
);
