/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ElasticsearchGraphNode } from '@kbn/workflows/graph/types';
import { selectFocusedStepInfo, selectWorkflowGraph } from '../../../../entities/workflows/store';
import { useKibana } from '../../../../hooks/use_kibana';
import { getElasticsearchRequestInfo } from '../../lib/elasticsearch_step_utils';

export interface CopyElasticSearchDevToolsOptionProps {
  onClick: () => void;
}

export const CopyElasticSearchDevToolsOption: React.FC<CopyElasticSearchDevToolsOptionProps> = ({
  onClick,
}) => {
  const workflowGraph = useSelector(selectWorkflowGraph);
  const focusedStepInfo = useSelector(selectFocusedStepInfo);
  const {
    services: { notifications },
  } = useKibana();

  function generateConsoleFormat(
    requestInfo: { method: string; url: string; data?: string[] },
    withParams: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  ): string {
    const lines = [`${requestInfo.method} ${requestInfo.url}`];

    if (requestInfo.data && requestInfo.data.length > 0) {
      lines.push(...requestInfo.data);
    }

    return lines.join('\n');
  }

  const copy = useCallback(async () => {
    if (!focusedStepInfo || !workflowGraph) {
      return;
    }

    try {
      const stepGraph = workflowGraph.getStepGraph(focusedStepInfo.stepId);
      const elasticSearchNode = stepGraph
        .getAllNodes()
        .find((node) => node.type.startsWith('kibana')) as ElasticsearchGraphNode;
      const stepType = elasticSearchNode.stepType;
      const requestInfo = getElasticsearchRequestInfo(
        stepType,
        elasticSearchNode.configuration.with
      );
      const consoleFormat = generateConsoleFormat(
        requestInfo,
        elasticSearchNode.configuration.with
      );

      await navigator.clipboard.writeText(consoleFormat);

      if (notifications) {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'plugins.workflowsManagement.copyDevToolsSnippetToClipboard.successTitle',
            {
              defaultMessage: 'Copied to clipboard',
            }
          ),
          text: i18n.translate(
            'plugins.workflowsManagement.copyDevToolsSnippetToClipboard.successText',
            {
              defaultMessage: 'Devtools command copied successfully',
            }
          ),
        });
      }
    } catch (error) {
      if (notifications) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate(
            'plugins.workflowsManagement.copyDevToolsSnippetToClipboard.errorTitle',
            {
              defaultMessage: 'Failed to copy',
            }
          ),
        });
      }
    }
    onClick();
  }, [focusedStepInfo, notifications, workflowGraph, onClick]);

  return (
    <EuiContextMenuItem
      data-test-subj={`actionButton-copy-as-console`}
      key="elasticsearch-copy-as-console"
      onClick={copy}
      icon="copy"
    >
      <FormattedMessage
        id="plugins.workflowsManagement.copyDevToolsSnippetToClipboard.buttonLabel"
        defaultMessage="Copy as devtools snippet"
      />
    </EuiContextMenuItem>
  );
};
