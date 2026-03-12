/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PanelPackage } from './presentation_container';

/**
 * This API can add a new panel as a child.
 */
export interface CanAddNewPanel {
  addNewPanel: <StateType extends object, ApiType extends unknown = unknown>(
    panel: PanelPackage<StateType>,
    options?: {
      displaySuccessMessage?: boolean;
      scrollToPanel?: boolean;
      beside?: string; // ID of an existing panel to place the new panel beside
    }
  ) => Promise<ApiType | undefined>;
}

/**
 * A type guard which can be used to determine if a given API can add a new panel.
 */
export const apiCanAddNewPanel = (api: unknown): api is CanAddNewPanel => {
  return typeof (api as CanAddNewPanel)?.addNewPanel === 'function';
};
