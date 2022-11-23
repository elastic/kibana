/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { useContext, useMemo } from 'react';

import { CellActionsContext } from './cell_actions_context';
import { ActionItem } from './cell_action_item';

// TODO Define an shared interface for all actions configuration
interface CellActionConfig {
  field: string;
  value: string;
}

interface CellActionsProps {
  config: CellActionConfig;
  triggerId: string;
}

export const CellActions = ({ config, triggerId }: CellActionsProps) => {
  const context = useContext(CellActionsContext);

  if (!context.getCompatibleActions) {
    throw new Error(
      'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
    );
  }

  // TODO wait for hover before calling getActions
  const actions = context.getCompatibleActions(triggerId, config);
  const actionContext = useMemo(
    () => ({ ...config, trigger: { id: triggerId } }),
    [config, triggerId]
  );

  const sortedActions = orderBy(['order', 'title'], ['desc', 'asc'], actions);

  const actionItems = sortedActions.map((action) => {
    return <ActionItem action={action} actionContext={actionContext} />;
  });

  return <>{actionItems}</>;
};
