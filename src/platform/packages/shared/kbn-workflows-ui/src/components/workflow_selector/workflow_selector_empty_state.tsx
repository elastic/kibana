/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiEmptyPrompt, EuiSelectableMessage, EuiText } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

interface WorkflowSelectorEmptyStateProps {
  createWorkflowHref: string;
}

export const WorkflowSelectorEmptyState: React.FC<WorkflowSelectorEmptyStateProps> = ({
  createWorkflowHref,
}) => {
  return (
    <EuiSelectableMessage>
      <EuiEmptyPrompt
        title={
          <EuiText textAlign="center" color="textParagraph">
            {i18n.EMPTY_STATE_TITLE}
          </EuiText>
        }
        titleSize="s"
        body={i18n.EMPTY_STATE_DESCRIPTION}
        actions={
          <EuiButton
            color="primary"
            fill={false}
            href={createWorkflowHref}
            target="_blank"
            iconType="plusInCircle"
            size="s"
          >
            {i18n.EMPTY_STATE_BUTTON_TEXT}
          </EuiButton>
        }
        paddingSize="l"
      />
    </EuiSelectableMessage>
  );
};
