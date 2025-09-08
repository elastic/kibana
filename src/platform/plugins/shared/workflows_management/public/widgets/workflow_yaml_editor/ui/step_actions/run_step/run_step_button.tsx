/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface RunStepButtonProps {
  onClick: () => void;
}

export const RunStepButton: React.FC<RunStepButtonProps> = ({ onClick }) => {
  return (
    <EuiButtonIcon
      iconType="play"
      onClick={onClick}
      data-test-subj="runStep"
      size="xs"
      aria-label={i18n.translate(
        'workflows.workflowDetail.yamlEditor.stepActions.runStep.ariaLabel',
        {
          defaultMessage: 'Run step',
        }
      )}
    />
  );
};
