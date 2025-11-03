/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This API can focus a child panel
 */
export interface CanFocusPanel {
  setFocusedPanelId: (panelId?: string) => void;
}

/**
 * A type guard which can be used to determine if a given API can focus a child panel
 */
export const apiCanFocusPanel = (api: unknown): api is CanFocusPanel => {
  return typeof (api as CanFocusPanel)?.setFocusedPanelId === 'function';
};
