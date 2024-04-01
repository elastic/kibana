/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface PanelPackage {
  panelType: string;
  initialState?: object;
}

/**
 * This API can access a view mode, either its own or from its parent API.
 */
export interface CanAddNewPanel {
  addNewPanel: <ApiType extends unknown = unknown>(
    panel: PanelPackage,
    displaySuccessMessage?: boolean
  ) => Promise<ApiType | undefined>;
}

/**
 * A type guard which can be used to determine if a given API has access to a view mode, its own or from its parent.
 */
export const apiCanAddNewPanel = (api: unknown): api is CanAddNewPanel => {
  return typeof (api as CanAddNewPanel)?.addNewPanel === 'function';
};
