/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';

import { PublishingSubject } from '@kbn/presentation-publishing';

import type {
  OptionsListDisplaySettings,
  OptionsListSelection,
} from '../../../../../common/options_list';
import type { ControlStateManager } from '../../types';
import type { OptionsListComponentApi, OptionsListComponentState } from './types';

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
