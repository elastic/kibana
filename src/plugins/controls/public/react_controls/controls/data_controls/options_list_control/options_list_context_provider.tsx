/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';

import { PublishingSubject } from '@kbn/presentation-publishing';
import { ControlStateManager } from '../../types';
import {
  OptionsListComponentApi,
  OptionsListComponentState,
  OptionsListDisplaySettings,
} from './types';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';

export type ContextStateManager = ControlStateManager<
  Omit<OptionsListComponentState, 'exclude' | 'existsSelected' | 'selectedOptions'>
> & {
  selectedOptions: PublishingSubject<OptionsListSelection[] | undefined>;
  existsSelected: PublishingSubject<boolean | undefined>;
  exclude: PublishingSubject<boolean | undefined>;
};

export const OptionsListControlContext = React.createContext<
  | {
      api: OptionsListComponentApi;
      stateManager: ContextStateManager;
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
