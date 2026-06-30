/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  selectWorkflowDefinition,
  selectWorkflowId,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { prepareWebhook, type PrepareWebhookResponse } from '../../../shared/lib/workflows_api';

const getWebhookTrigger = (workflowDefinition: WorkflowYaml | null | undefined) =>
  workflowDefinition?.triggers?.find((trigger) => trigger.type === 'webhook') as
    | {
        auth?: { type: 'none' } | { type: 'apiKey' } | { type: 'basic'; username: string };
      }
    | undefined;

const sampleBody = JSON.stringify({ message: 'Hello from webhook' }, null, 2);

export const WebhookTriggerPanel = React.memo(function WebhookTriggerPanel() {
  const workflowId = useSelector(selectWorkflowId);
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const webhookTrigger = getWebhookTrigger(workflowDefinition);
  const { http, notifications } = useKibana().services;
  const [prepareResult, setPrepareResult] = useState<PrepareWebhookResponse | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const webhookUrl = useMemo(() => {
    if (!prepareResult) {
      return null;
    }
    return `${window.location.origin}${http.basePath.prepend(prepareResult.urlPath)}`;
  }, [http.basePath, prepareResult]);

  if (!workflowId || !webhookTrigger) {
    return null;
  }

  const authType = prepareResult?.authType ?? webhookTrigger.auth?.type ?? 'none';
  const prepare = async () => {
    setIsPreparing(true);
    try {
      setPrepareResult(await prepareWebhook(http, workflowId));
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('workflows.webhookTriggerPanel.prepareErrorTitle', {
          defaultMessage: 'Unable to prepare webhook',
        }),
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const authHeader =
    authType === 'apiKey'
      ? `-H 'Authorization: ApiKey ${prepareResult?.apiKey?.encoded ?? '<api-key>'}'`
      : authType === 'basic'
      ? `-u '${webhookTrigger.auth?.type === 'basic' ? webhookTrigger.auth.username : '<user>'}:<password>'`
      : '';
  const postCurl = webhookUrl
    ? [
        `curl -X POST '${webhookUrl}'`,
        `  -H 'Content-Type: application/json'`,
        ...(authHeader ? [`  ${authHeader}`] : []),
        `  -d '${sampleBody}'`,
      ].join(' \\\n')
    : '';
  const getCurl = webhookUrl
    ? [
        `curl '${webhookUrl}?message=Hello%20from%20webhook'`,
        ...(authHeader ? [`  ${authHeader}`] : []),
      ].join(' \\\n')
    : '';

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="webhookTriggerPanel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('workflows.webhookTriggerPanel.title', {
                defaultMessage: 'Webhook URL',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('workflows.webhookTriggerPanel.description', {
              defaultMessage:
                'Prepare this workflow, then call the public endpoint to execute the webhook trigger.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" isLoading={isPreparing} onClick={prepare}>
            {i18n.translate('workflows.webhookTriggerPanel.prepareButton', {
              defaultMessage: 'Prepare webhook',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {webhookUrl && (
        <>
          <EuiSpacer size="m" />
          {authType === 'apiKey' && prepareResult?.apiKey && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                title={i18n.translate('workflows.webhookTriggerPanel.apiKeyWarning', {
                  defaultMessage:
                    'Copy this API key now. This prototype does not implement key reveal or rotation.',
                })}
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiCodeBlock language="bash" fontSize="s" isCopyable>
            {postCurl}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="bash" fontSize="s" isCopyable>
            {getCurl}
          </EuiCodeBlock>
        </>
      )}
    </EuiPanel>
  );
});
