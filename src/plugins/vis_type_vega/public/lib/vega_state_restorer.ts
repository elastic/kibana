/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

interface VegaStateRestorerOptions {
  restoreData?: boolean;
  omitSignals?: string[];
}

type State = Partial<{
  signals: Record<string, any>;
  data: Record<string, any>;
}>;

export const createVegaStateRestorer = (options: VegaStateRestorerOptions = {}) => {
  let state: State | null;

  return {
    save: (newState: State) => {
      if (newState) {
        state = {
          signals: omit(newState.signals, options.omitSignals || []),
          ...(options.restoreData ? { data: newState.data } : undefined),
        };
      }
    },
    restore: () => state,
    clear: () => {
      state = null;
    },
  };
};
