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
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { selectEditorFocusedStepInfo } from '../../../../entities/workflows/store';

export interface CopyWorkflowStepJsonOptionProps {
  onClick: () => void;
}

export const CopyWorkflowStepJsonOption: React.FC<CopyWorkflowStepJsonOptionProps> = ({
  onClick,
}) => {
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const {
    services: { notifications },
  } = useKibana<CoreStart>();

  const copy = useCallback(async () => {
    if (!focusedStepInfo) {
      return;
    }

    try {
      // Get the entire step YAML
      await navigator.clipboard.writeText(JSON.stringify(focusedStepInfo.stepYamlNode, null, 2));

      if (notifications) {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'plugins.workflowsManagement.copyWorkflowStepToClipboard.successTitle',
            {
              defaultMessage: 'Copied to clipboard',
            }
          ),
          text: i18n.translate(
            'plugins.workflowsManagement.copyWorkflowStepToClipboard.successText',
            {
              defaultMessage: 'Workflow step copied successfully',
            }
          ),
        });
      }
    } catch (error) {
      if (notifications) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate(
            'plugins.workflowsManagement.copyWorkflowStepToClipboard.errorTitle',
            {
              defaultMessage: 'Failed to copy',
            }
          ),
        });
      }
    }
    onClick();
  }, [focusedStepInfo, notifications, onClick]);

  return (
    <EuiContextMenuItem
      data-test-subj={`actionButton-copy-step-as-json`}
      key="copy-step-as-json"
      onClick={copy}
      icon="copy"
    >
      <FormattedMessage
        id="plugins.workflowsManagement.copyWorkflowStepAsJson.buttonLabel"
        defaultMessage="Copy as JSON"
      />
    </EuiContextMenuItem>
  );
};
