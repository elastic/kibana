/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import type { OptionsListDisplaySettings } from '../../../../common/options_list';
import type { OptionsListComponentApi } from './types';

export const OptionsListControlContext = React.createContext<
  | {
      componentApi: OptionsListComponentApi;
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
