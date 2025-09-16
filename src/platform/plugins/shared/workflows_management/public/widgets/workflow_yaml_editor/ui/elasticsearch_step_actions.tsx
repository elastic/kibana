/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { RunStepButton } from './step_actions/run_step/run_step_button';

export interface ElasticsearchStepActionsProps {
  actionsProvider: any; // We'll make this optional since we're transitioning to unified providers
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const ElasticsearchStepActions: React.FC<ElasticsearchStepActionsProps> = ({
  actionsProvider,
  http,
  notifications,
  esHost,
  kibanaHost,
  onStepActionClicked,
}) => {
  // Use state to force re-renders when actions change
  const [, setRefreshTrigger] = useState(0);

  // Get current actions directly from the unified actions provider
  const currentActions = actionsProvider?.getCurrentActions?.() || [];

  // Listen for action updates - force refresh every 100ms when actions might change
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const currentStep = actionsProvider?.getCurrentElasticsearchStep();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {currentStep && (
        <EuiFlexItem grow={false}>
          <RunStepButton
            onClick={() =>
              onStepActionClicked?.({
                stepId: currentStep.name as string,
                actionType: 'run',
              })
            }
          />
        </EuiFlexItem>
      )}
      {currentActions?.map((action: any, index: number) => (
        <EuiFlexItem key={action.id || index} grow={false}>
          <EuiToolTip content={action.tooltip || action.label}>
            <EuiButtonIcon
              iconType={action.icon || 'console'}
              onClick={action.handler}
              data-test-subj={`actionButton-${action.id}`}
              aria-label={action.label}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
