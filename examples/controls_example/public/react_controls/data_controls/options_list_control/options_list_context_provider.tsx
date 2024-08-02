/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';

import { ControlStateManager } from '../../types';
import {
  OptionsListComponentApi,
  OptionsListComponentState,
  OptionsListDisplaySettings,
} from './types';

export const OptionsListControlContext = React.createContext<
  | {
      api: OptionsListComponentApi;
      stateManager: ControlStateManager<OptionsListComponentState>;
      displaySettings: OptionsListDisplaySettings;
    }
  | undefined
>(undefined);

export const useOptionsListContext = () => {
  const optionsListContext = useContext(OptionsListControlContext);
  if (!optionsListContext)
    throw new Error(
      'No OptionsListControlContext.Provider found when calling useOptionsListContext.'
    );
  return optionsListContext;
};
