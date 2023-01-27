/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { EuiButtonIcon, EuiToolTip, IconType } from '@elastic/eui';
import type { CellAction, CellActionExecutionContext } from '../types';

export const ActionItem = ({
  action,
  actionContext,
  showTooltip,
}: {
  action: CellAction;
  actionContext: CellActionExecutionContext;
  showTooltip: boolean;
}) => {
  const actionProps = useMemo(
    () => ({
      iconType: action.getIconType(actionContext) as IconType,
      onClick: () => action.execute(actionContext),
      'data-test-subj': `actionItem-${action.id}`,
      'aria-label': action.getDisplayName(actionContext),
    }),
    [action, actionContext]
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
