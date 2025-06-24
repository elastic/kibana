/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import type { IconType } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { CellAction, CellActionExecutionContext } from '../types';

export const ActionItem = ({
  action,
  actionContext,
  showTooltip,
  onClick,
}: {
  action: CellAction;
  actionContext: CellActionExecutionContext;
  showTooltip: boolean;
  onClick?: () => void;
}) => {
  const actionProps = useMemo(
    () => ({
      iconType: action.getIconType(actionContext) as IconType,
      onClick: () => {
        action.execute(actionContext);
        if (onClick) onClick();
      },
      'data-test-subj': `actionItem-${action.id}`,
      'aria-label': action.getDisplayName(actionContext),
    }),
    [action, actionContext, onClick]
  );

  if (!actionProps.iconType) return null;

  return showTooltip ? (
    <EuiToolTip
      content={action.getDisplayNameTooltip ? action.getDisplayNameTooltip(actionContext) : ''}
    >
      <EuiButtonIcon {...actionProps} iconSize="s" />
    </EuiToolTip>
  ) : (
    <EuiButtonIcon {...actionProps} iconSize="s" />
  );
};
