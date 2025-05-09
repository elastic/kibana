/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StateComparators } from '@kbn/presentation-publishing';

import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import {
  DEFAULT_CONTROL_GROW,
  type DefaultControlState,
  DEFAULT_CONTROL_WIDTH,
} from '../../common';
import type { ControlApiInitialization, DefaultControlApi } from './types';

export type ControlApi = ControlApiInitialization<DefaultControlApi>;

export const defaultControlComparators: StateComparators<
  DefaultControlState & {
    dataLoading?: boolean;
    blockingError?: Error;
  }
> = {
  blockingError: 'skip',
  dataLoading: 'skip',
  grow: 'referenceEquality',
  width: 'referenceEquality',
};

export const defaultControlDefaultValues = {
  blockingError: undefined,
  dataLoading: false,
  grow: DEFAULT_CONTROL_GROW,
  width: DEFAULT_CONTROL_WIDTH,
};

export const initializeDefaultControlManager = (state: DefaultControlState) => {
  return initializeStateManager<
    DefaultControlState & {
      dataLoading?: boolean;
      blockingError?: Error;
    }
  >(state, defaultControlDefaultValues);
};
