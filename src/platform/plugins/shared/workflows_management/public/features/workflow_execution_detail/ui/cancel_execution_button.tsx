/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface CancelExecutionButtonProps {
  executionId: string;
}

export const CancelExecutionButton: React.FC<CancelExecutionButtonProps> = ({ executionId }) => {
  const { services } = useKibana();
  const [isCancellationRequested, setIsCancellationRequested] = React.useState(false);

  const handleClick = async () => {
    await services.http?.post(`/api/workflowExecutions/${executionId}/cancel`);
    setIsCancellationRequested(true);
  };

  return (
    <EuiButton
      color="danger"
      iconType="cross"
      disabled={isCancellationRequested}
      onClick={handleClick}
      data-test-subj="cancelExecutionButton"
    >
      {i18n.translate('workflowsManagement.executionDetail.cancelButton', {
        defaultMessage: 'Cancel execution',
      })}
    </EuiButton>
  );
};
