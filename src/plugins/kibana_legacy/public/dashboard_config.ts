/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface DashboardConfig {
  turnHideWriteControlsOn(): void;
  getHideWriteControls(): boolean;
}

export function getDashboardConfig(hideWriteControls: boolean): DashboardConfig {
  let _hideWriteControls = hideWriteControls;

  return {
    /**
     * Part of the exposed plugin API - do not remove without careful consideration.
     * @type {boolean}
     */
    turnHideWriteControlsOn() {
      _hideWriteControls = true;
    },
    getHideWriteControls() {
      return _hideWriteControls;
    },
  };
}
