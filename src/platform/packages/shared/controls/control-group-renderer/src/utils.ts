/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupRendererApi, HasEditorConfig } from './types';

export const apiHasEditorConfig = (parentApi: unknown): parentApi is HasEditorConfig => {
  return typeof (parentApi as HasEditorConfig).getEditorConfig === 'function';
};

export const isControlGroupRendererApi = (api: unknown): api is ControlGroupRendererApi => {
  return Boolean(typeof (api as ControlGroupRendererApi).getControls === 'function');
};
