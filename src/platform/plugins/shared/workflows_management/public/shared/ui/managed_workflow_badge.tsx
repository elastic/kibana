/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface ManagedWorkflowBadgeProps {
  dataTestSubj?: string;
}

const managedWorkflowLabel = i18n.translate('workflows.managedWorkflowBadge.label', {
  defaultMessage: 'Managed',
});

const managedWorkflowTooltip = i18n.translate('workflows.managedWorkflowBadge.tooltip', {
  defaultMessage: 'Elastic manages this workflow.',
});

export const ManagedWorkflowBadge = ({
  dataTestSubj = 'managedWorkflowBadge',
}: ManagedWorkflowBadgeProps) => (
  <EuiToolTip content={managedWorkflowTooltip} position="bottom">
    <EuiBadge
      color="primary"
      title={managedWorkflowLabel}
      data-test-subj={dataTestSubj}
      tabIndex={0}
    >
      {managedWorkflowLabel}
    </EuiBadge>
  </EuiToolTip>
);
