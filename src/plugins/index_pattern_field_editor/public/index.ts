/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPatternFieldEditorPlugin } from './plugin';

export { FieldFormatEditor, FieldFormatEditorFactory, FormatEditorProps } from './components';
export { DefaultFormatEditor } from './components/field_format_editor/editors/default/default';
export type { OpenFieldDeleteModalOptions } from './open_delete_modal';
// Expose types
export type { OpenFieldEditorOptions } from './open_editor';
export type {
  PluginSetup as IndexPatternFieldEditorSetup,
  PluginStart as IndexPatternFieldEditorStart,
} from './types';

export function plugin() {
  return new IndexPatternFieldEditorPlugin();
}
