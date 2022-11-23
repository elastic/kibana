/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

// FIXME can't import plugin from package
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { EuiButtonIcon, IconType } from '@elastic/eui';

export const ActionItem = ({
  action,
  actionContext,
}: {
  action: Action;
  actionContext: ActionExecutionContext;
}) => {
  const actionProps = useMemo(
    () => ({
      iconType: action.getIconType(actionContext) as IconType,
      onClick: () => action.execute(actionContext),
      'data-test-subj': `actionItem-${action.id}`,
      'aria-label': action.getDisplayName(actionContext),
      // toolTipContent: action.getDisplayNameTooltip ? action.getDisplayNameTooltip(context) : '',
      // component: action.MenuItem ? React.createElement(uiToReactComponent(action.MenuItem), { context }) : action.getDisplayName(context),
      // href: action.getHref ? await action.getHref(context) : undefined,
      // _order: action.order || 0,
      // _title: action.getDisplayName(context),
      // disabled: action.disabled,
    }),
    [action, actionContext]
  );

  return <>{actionProps.iconType ? <EuiButtonIcon {...actionProps} iconSize="s" /> : null}</>;
};
