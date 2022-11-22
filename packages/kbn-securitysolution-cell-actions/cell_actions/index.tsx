/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';

import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { EuiIcon } from '@elastic/eui';
import { CellActionsContext } from './cell_actions_context';
interface CellActionsProps {
  getActionContext: () => ActionExecutionContext;
  triggerId: string;
}

export const CellActions = ({ getActionContext, triggerId }: CellActionsProps) => {
  const context = useContext(CellActionsContext);

  if (!context.getActions) {
    throw new Error(
      'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
    );
  }

  const actions = context.getActions(triggerId);

  const actionContext = getActionContext(); // TODO Does it require the triggerId?

  return (
    <>
      {actions.map((action) => {
        const iconType = action.getIconType(actionContext);

        return (
          <div>
            {iconType ? <EuiIcon type={iconType} /> : null}
            {action.getDisplayName(actionContext)}
          </div>
        );
      })}
    </>
  );
};
