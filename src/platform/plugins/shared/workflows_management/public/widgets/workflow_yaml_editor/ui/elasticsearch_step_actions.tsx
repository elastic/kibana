/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchStepData } from '../lib/elasticsearch_step_utils';
import type { ElasticsearchStepActionsProvider } from '../lib/elasticsearch_step_actions_provider';
import { 
  copyStepAs, 
  copyAsConsole, 
  type CopyAsOptions
} from '../lib/copy_request_utils';

export interface ElasticsearchStepActionsProps {
  actionsProvider: ElasticsearchStepActionsProvider | null;
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
}

export const ElasticsearchStepActions: React.FC<ElasticsearchStepActionsProps> = ({
  actionsProvider,
  http,
  notifications,
  esHost,
  kibanaHost,
}) => {
  const currentStep = actionsProvider?.getCurrentElasticsearchStep();
  
  const copyAsOptions: CopyAsOptions = {
    http,
    notifications,
    esHost,
    kibanaHost,
  };

  const handleCopyAsConsole = useCallback(async () => {
    if (!currentStep) return;
    await copyAsConsole(currentStep, copyAsOptions);
  }, [currentStep, copyAsOptions]);



  if (!currentStep) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAsConsoleTooltip', {
            defaultMessage: 'Copy as Console format'
          })}
        >
          <EuiButtonIcon
            iconType="console"
            onClick={handleCopyAsConsole}
            data-test-subj="copyAsConsoleButton"
            aria-label={i18n.translate('workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAsConsoleAriaLabel', {
              defaultMessage: 'Copy as Console format'
            })}
            size="s"
          />
        </EuiToolTip>
      </EuiFlexItem>
      

    </EuiFlexGroup>
  );
};
