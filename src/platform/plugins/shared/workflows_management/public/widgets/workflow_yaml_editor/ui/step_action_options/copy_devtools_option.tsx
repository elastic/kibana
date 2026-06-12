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
import type { RequestOptions } from '@kbn/workflows';
import { buildElasticsearchRequest, buildKibanaRequest } from '@kbn/workflows';
import {
  type ElasticsearchGraphNode,
  isElasticsearch,
  isKibana,
  type KibanaGraphNode,
} from '@kbn/workflows/graph/types';
import {
  selectEditorFocusedStepInfo,
  selectEditorWorkflowGraph,
} from '../../../../entities/workflows/store';
import { useKibana } from '../../../../hooks/use_kibana';

export interface CopyDevToolsOptionProps {
  onClick: () => void;
}

/**
 * Combined copy-as-devtools option that works for both Elasticsearch and Kibana steps
 */
export const CopyDevToolsOption: React.FC<CopyDevToolsOptionProps> = ({ onClick }) => {
  const workflowGraph = useSelector(selectEditorWorkflowGraph);
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const {
    services: { notifications },
  } = useKibana();

  const copy = useCallback(async () => {
    if (!focusedStepInfo || !workflowGraph) {
      return;
    }

    try {
      const stepGraph = workflowGraph.getStepGraph(focusedStepInfo.stepId);
      const allNodes = stepGraph.getAllNodes();

      let consoleFormat: string | null = null;

      // Check for Elasticsearch step
      const esNode = allNodes.find((node): node is ElasticsearchGraphNode => isElasticsearch(node));
      if (esNode) {
        const stepType = esNode.stepType;
        const requestInfo = buildElasticsearchRequest(stepType, esNode.configuration.with || {});
        consoleFormat = generateConsoleFormat(requestInfo);
      }

      // Check for Kibana step
      const kibanaNode = allNodes.find((node): node is KibanaGraphNode => isKibana(node));
      if (kibanaNode) {
        const stepType = kibanaNode.configuration.type;
        const requestInfo = buildKibanaRequest(stepType, kibanaNode.configuration.with || {});
        consoleFormat = generateConsoleFormat({
          ...requestInfo,
          // request builder returns path prefixed with one slash, but for kibana apis we need two slashes and a kbn prefix
          path: `kbn:/${requestInfo.path}`,
        });
      }

      if (!consoleFormat) {
        return;
      }

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
      data-test-subj="actionButton-copy-as-console"
      key="copy-as-console"
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

function generateConsoleFormat(requestInfo: RequestOptions): string {
  // Handle query params - could be either 'query' or 'params' depending on the builder
  const queryParams = requestInfo.query;
  const queryString = queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '';

  const lines = [`${requestInfo.method} ${decodeURIComponent(requestInfo.path)}${queryString}`];

  if (requestInfo.bulkBody && requestInfo.bulkBody.length > 0) {
    requestInfo.bulkBody.forEach((operation: Record<string, unknown>) => {
      lines.push(JSON.stringify(operation, null, 2));
    });
  } else if (requestInfo.body && Object.keys(requestInfo.body).length > 0) {
    lines.push(JSON.stringify(requestInfo.body, null, 2));
  }

  return lines.join('\n');
}
