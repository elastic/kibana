/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { getRunMode } from '../lib/get_run_mode';

const STEP_TEST_NAME_MAX_LEN = 24;

const testRunLabel = i18n.translate('workflows.executionFlyout.runMode.testRun', {
  defaultMessage: 'Test run',
});

const truncateStepName = (name: string): string =>
  name.length > STEP_TEST_NAME_MAX_LEN ? `${name.slice(0, STEP_TEST_NAME_MAX_LEN)}…` : name;

interface ExecutionRunTagsProps {
  workflowExecution: WorkflowExecutionDto | undefined;
  workflowTags: string[];
}

/** Test-run badges and the workflow's tags. Renders nothing when there is neither. */
export const ExecutionRunTags = ({ workflowExecution, workflowTags }: ExecutionRunTagsProps) => {
  const runModeInfo = useMemo(
    () => (workflowExecution ? getRunMode(workflowExecution) : null),
    [workflowExecution]
  );
  const showRunModeBadge = runModeInfo?.runMode === 'test' || runModeInfo?.runMode === 'stepTest';
  const showTagsRow = showRunModeBadge || workflowTags.length > 0;
  const stepTestTargetName = runModeInfo?.stepTestTargetName ?? '';

  if (!showTagsRow) return null;

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {runModeInfo?.runMode === 'test' && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" iconType="flask">
            {testRunLabel}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {runModeInfo?.runMode === 'stepTest' && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={stepTestTargetName}>
            <EuiBadge tabIndex={0} color="warning" iconType="flask">
              {i18n.translate('workflows.executionFlyout.runMode.stepTest', {
                defaultMessage: 'Step test: {name}',
                values: { name: truncateStepName(stepTestTargetName) },
              })}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {workflowTags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
