import './src/register_globals';
export { monaco } from './src/monaco_imports';
import * as BarePluginApi from 'monaco-editor/esm/vs/editor/editor.api';
export * from './src/languages';
export { BarePluginApi };
export type * from './src/types';
export { defaultThemesResolvers, CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID, } from './src/code_editor';
export { getUndoRedoService } from './src/undo_redo_service';
export type { UndoRedoService, UndoRedoElement } from './src/undo_redo_service';
