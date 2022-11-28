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
import { EuiButtonIcon, EuiToolTip, IconType } from '@elastic/eui';

export const ActionItem = ({
  action,
  actionContext,
  showTooltip,
}: {
  action: Action;
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
}) => {
  const actionProps = useMemo(
    () => ({
      iconType: action.getIconType(actionContext) as IconType,
      onClick: () => action.execute(actionContext),
      'data-test-subj': `actionItem-${action.id}`,
      'aria-label': action.getDisplayName(actionContext),
      // component: action.MenuItem ? React.createElement(uiToReactComponent(action.MenuItem), { context }) : action.getDisplayName(context),
      // href: action.getHref ? await action.getHref(context) : undefined,
      // _title: action.getDisplayName(context),
      // disabled: action.disabled,
    }),
    [action, actionContext]
  );

  if (!actionProps.iconType) return null;

  return showTooltip ? (
    <EuiToolTip
      content={
        // <TooltipWithKeyboardShortcut
        //   additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
        //     field,
        //     value,
        //   })}
        // content={FILTER_FOR_VALUE}
        // shortcut={FILTER_FOR_VALUE_KEYBOARD_SHORTCUT}
        // showShortcut={ownFocus}
        // />
        action.getDisplayNameTooltip ? action.getDisplayNameTooltip(actionContext) : ''
      }
    >
      <EuiButtonIcon {...actionProps} iconSize="s" />
    </EuiToolTip>
  ) : (
    <EuiButtonIcon {...actionProps} iconSize="s" />
  );
};
