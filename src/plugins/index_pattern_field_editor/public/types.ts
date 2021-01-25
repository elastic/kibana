/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { OpenFieldEditorOptions } from './open_editor';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export interface PluginStart {
  openEditor(options: OpenFieldEditorOptions): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartPlugins {}
