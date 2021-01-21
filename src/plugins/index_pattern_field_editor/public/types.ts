/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { OpenFieldEditorProps } from './load_editor';

export interface LoadEditorResponse {
  openEditor(props: OpenFieldEditorProps): () => void;
}

export interface PluginSetup {
  loadEditor(): Promise<LoadEditorResponse>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartPlugins {}
