/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { selectIsYamlSyntaxValid } from '../../../entities/workflows/store/workflow_detail/selectors';
import { getRunStepTooltipContent } from '../../../shared/ui/workflow_action_buttons/get_workflow_tooltip_content';

export interface RunStepButtonProps {
  onClick: () => void;
}
export const RunStepButton = React.memo<RunStepButtonProps>(({ onClick }) => {
  // To execute a single step, the yaml of the entire workflow must be parsable. Not just the step yaml.
  const isValidSyntax = useSelector(selectIsYamlSyntaxValid);
  const { canExecuteWorkflow } = useWorkflowsCapabilities();

  const tooltipContent = useMemo(
    () => getRunStepTooltipContent({ isValid: isValidSyntax, canExecuteWorkflow }),
    [isValidSyntax, canExecuteWorkflow]
  );

  const isDisabled = !isValidSyntax || !canExecuteWorkflow;

  return (
    <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="play"
        onClick={onClick}
        color="success"
        data-test-subj="workflowRunStep"
        iconSize="s"
        aria-label={tooltipContent}
        disabled={isDisabled}
      />
    </EuiToolTip>
  );
});
RunStepButton.displayName = 'RunStepButton';
