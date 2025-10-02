/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ElasticsearchGraphNode } from '@kbn/workflows/graph/types';
import { useSelector } from 'react-redux';
import { selectFocusedStepInfo, selectWorkflowGraph } from '../../lib/store';
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
  } = useKibana<CoreStart>();

  function generateConsoleFormat(
    requestInfo: { method: string; url: string; data?: string[] },
    withParams: Record<string, any>
  ): string {
    const lines = [`${requestInfo.method} ${requestInfo.url}`];

    if (requestInfo.data && requestInfo.data.length > 0) {
      lines.push(...requestInfo.data);
    }

    return lines.join('\n');
  }

  const copy = useCallback(async () => {
    if (!focusedStepInfo) {
      return;
    }

    try {
      const stepGraph = workflowGraph?.getStepGraph(focusedStepInfo?.stepId);
      const elasticSearchNode = stepGraph?.getAllNodes()[0] as ElasticsearchGraphNode;
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
          title: 'Copied to clipboard',
          text: 'Devtools command copied successfully',
        });
      }
    } catch (error) {
      if (notifications) {
        notifications.toasts.addError(error as Error, {
          title: 'Failed to copy',
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
      Copy as devtools snippet
    </EuiContextMenuItem>
  );
};
