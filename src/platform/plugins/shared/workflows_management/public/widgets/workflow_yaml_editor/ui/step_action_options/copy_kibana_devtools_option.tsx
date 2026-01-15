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
import { buildKibanaRequestFromAction } from '@kbn/workflows';
import { isKibana, type KibanaGraphNode } from '@kbn/workflows/graph/types';
import {
  selectEditorFocusedStepInfo,
  selectEditorWorkflowGraph,
} from '../../../../entities/workflows/store';
import { useKibana } from '../../../../hooks/use_kibana';

export interface CopyKibanaDevToolsOptionProps {
  onClick: () => void;
}

export const CopyKibanaDevToolsOption: React.FC<CopyKibanaDevToolsOptionProps> = ({ onClick }) => {
  const workflowGraph = useSelector(selectEditorWorkflowGraph);
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const {
    services: { notifications },
  } = useKibana();

  function generateConsoleFormat(requestInfo: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
  }): string {
    const lines = [
      `${requestInfo.method} kbn:/${requestInfo.path}${
        requestInfo.query
          ? `?${new URLSearchParams(requestInfo.query as Record<string, string>).toString()}`
          : ''
      }`,
    ];

    if (requestInfo.body && Object.keys(requestInfo.body).length > 0) {
      lines.push(JSON.stringify(requestInfo.body, null, 2));
    }

    return lines.join('\n');
  }

  const copy = useCallback(async () => {
    if (!focusedStepInfo || !workflowGraph) {
      return;
    }

    try {
      const stepGraph = workflowGraph.getStepGraph(focusedStepInfo.stepId);
      const kibanaNode = stepGraph
        .getAllNodes()
        .find((node): node is KibanaGraphNode => isKibana(node));
      if (!kibanaNode) {
        return;
      }
      const stepType = kibanaNode.configuration.type;
      const requestInfo = buildKibanaRequestFromAction(stepType, kibanaNode.configuration.with);
      const consoleFormat = generateConsoleFormat(requestInfo);

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
