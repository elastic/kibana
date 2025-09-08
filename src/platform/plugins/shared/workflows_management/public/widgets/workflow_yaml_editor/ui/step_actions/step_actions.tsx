/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { StepActionsProvider } from './step_actions_provider';
import { RunStepButton } from './run_step/run_step_button';

interface StepActionsProps {
  provider: StepActionsProvider;
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const StepActions: React.FC<StepActionsProps> = ({ provider, onStepActionClicked }) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <RunStepButton
          onClick={() =>
            onStepActionClicked?.({
              stepId: provider.getCurrentElasticsearchStep()?.name as string,
              actionType: 'run',
            })
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
