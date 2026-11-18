/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt, EuiIllustration } from '@elastic/eui';
import { checklistDoc } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useKibana } from '../../hooks/use_kibana';

const centeredCss = css({
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: 'calc(100vh - 220px)',
});

const promptCss = css({
  width: '100%',
  maxWidth: 760,
});

export const ExecutionsEmptyState = () => {
  const { application } = useKibana().services;
  const { canCreateWorkflow } = useWorkflowsCapabilities();

  const viewWorkflows = useCallback(() => {
    application.navigateToApp('workflows', { path: '/?runnableExamples=1' });
  }, [application]);

  const createWorkflow = useCallback(() => {
    application.navigateToApp('workflows', { path: '/create' });
  }, [application]);

  return (
    <div css={centeredCss}>
      <EuiEmptyPrompt
        css={promptCss}
        data-test-subj="workflowExecutionsEmptyState"
        layout="horizontal"
        color="plain"
        hasBorder
        paddingSize="l"
        icon={
          <EuiIllustration
            type={checklistDoc}
            alt=""
            style={{ maxInlineSize: 180, marginInline: 'auto' }}
          />
        }
        title={
          <h2>
            {i18n.translate('workflows.executionsPage.emptyState.title', {
              defaultMessage: 'No workflows have run yet',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('workflows.executionsPage.emptyState.body', {
              defaultMessage:
                'Executions show up here after a workflow runs. View your workflows and run one to get started, or create a new one.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            fill
            onClick={viewWorkflows}
            data-test-subj="workflowExecutionsEmptyViewWorkflows"
          >
            {i18n.translate('workflows.executionsPage.emptyState.viewWorkflows', {
              defaultMessage: 'View workflows',
            })}
          </EuiButton>,
          <EuiButtonEmpty
            onClick={createWorkflow}
            isDisabled={!canCreateWorkflow}
            data-test-subj="workflowExecutionsEmptyCreateWorkflow"
          >
            {i18n.translate('workflows.executionsPage.emptyState.createWorkflow', {
              defaultMessage: 'Create workflow',
            })}
          </EuiButtonEmpty>,
        ]}
      />
    </div>
  );
};
