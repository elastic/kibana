/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

export const WorkflowsEmptyState: React.FC<{
  onCreateWorkflow: () => void;
  title: string;
  description: string;
  buttonText: string;
}> = ({ onCreateWorkflow, title, description, buttonText }) => {
  return (
    <EuiEmptyPrompt
      iconType="workflowsApp"
      title={<span>{title}</span>}
      body={<span>{description}</span>}
      actions={[
        <EuiButton key="create-workflow" onClick={onCreateWorkflow} iconType="plusInCircle" fill>
          {buttonText}
        </EuiButton>,
      ]}
    />
  );
};
