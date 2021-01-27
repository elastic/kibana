/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { OpenFieldEditorOptions } from './open_editor';
import { RuntimeType } from './shared_imports';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export interface PluginStart {
  openEditor(options: OpenFieldEditorOptions): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartPlugins {}

export interface Field {
  name: string;
  type: RuntimeType | string;
  script?: {
    source: string;
  };
  customLabel?: string;
  popularity?: number;
  format?: Record<string, any>; // TODO set correct interface
}

export interface ComboBoxOption<T = unknown> {
  label: string;
  value?: T;
}
