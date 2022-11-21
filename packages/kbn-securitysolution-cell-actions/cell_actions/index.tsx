/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { CellActionsContext } from './cell_actions_context';

export const CellActions = () => {
  const context = useContext(CellActionsContext);

  if (!context.getActions) {
    throw new Error(
      'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
    );
  }

  const actions = context.getActions('lol');

  return <span>{'TODO CellActions component' + actions}</span>;
};
