/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';

interface VegaStateRestorerOptions {
  /**
   *  List of excluded signals
   *
   *  By default, all Build-in signals (width,height,padding,autosize,background) were excluded
   *  @see https://vega.github.io/vega/docs/signals/
   */
  omitSignals?: string[];
  /**
   * Gets a value that indicates whether the VegaStateRestorer is active.
   */
  isActive?: () => boolean;
}

type State = Partial<{
  signals: Record<string, any>;
  data: Record<string, any>;
}>;

export const createVegaStateRestorer = ({
  omitSignals = ['width', 'height', 'padding', 'autosize', 'background'],
  isActive = () => true,
}: VegaStateRestorerOptions = {}) => {
  let state: State | null;

  return {
    /**
     * Save Vega state
     * @public
     * @param newState - new state value
     */
    save: (newState: State) => {
      if (newState && isActive()) {
        state = {
          signals: omit(newState.signals, omitSignals || []),
          data: newState.data,
        };
      }
    },

    /**
     * Restore Vega state
     * @public
     * @param restoreData - by default, we only recover signals,
     *        but if the data also needs to be recovered, this option should be set to true
     */
    restore: (restoreData = false) =>
      isActive() && state ? omit(state, restoreData ? undefined : 'data') : null,

    /**
     *  Clear saved Vega state
     *
     *  @public
     */
    clear: () => {
      state = null;
    },
  };
};
