/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { selectIsYamlSyntaxValid } from '../../../entities/workflows/store/workflow_detail/selectors';

const Text = {
  run: i18n.translate('workflows.workflowDetail.yamlEditor.stepActions.runStep.tooltip', {
    defaultMessage: 'Run step',
  }),
  invalid: i18n.translate('workflows.workflowDetail.yamlEditor.stepActions.runStep.disabled', {
    defaultMessage: 'Fix errors to run the step',
  }),
};

export interface RunStepButtonProps {
  onClick: () => void;
}
export const RunStepButton = React.memo<RunStepButtonProps>(({ onClick }) => {
  // To execute a single step, the yaml of the entire workflow must be parsable. Not just the step yaml.
  const isValidSyntax = useSelector(selectIsYamlSyntaxValid);
  return (
    <EuiToolTip content={isValidSyntax ? Text.run : Text.invalid} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="play"
        onClick={onClick}
        color="success"
        data-test-subj="workflowRunStep"
        iconSize="s"
        aria-label={isValidSyntax ? Text.run : Text.invalid}
        disabled={!isValidSyntax}
      />
    </EuiToolTip>
  );
});
RunStepButton.displayName = 'RunStepButton';
