/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './src/register_globals';

export { monaco, jsonDefaults } from './src/monaco_imports';

/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as BarePluginApi from 'monaco-editor/editor/editor.api.js';

import { HoverParticipantRegistry as hoverParticipantRegistry } from './src/monaco_imports';

export * from './src/languages/definitions';
export { getWorker } from './src/languages/worker_factory';

export { BarePluginApi };
export type * from './src/types';

export {
  defaultThemesResolvers,
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
} from './src/code_editor';

export { getUndoRedoService } from './src/common/undo_redo_service';
export type { UndoRedoService, UndoRedoElement } from './src/common/undo_redo_service';
export {
  setClipboardContextMenuLabels,
  type ClipboardContextMenuLabels,
} from './src/common/clipboard_context_menu_actions';

/**
 * A hover participant instance. Only the members we actually reach for are described —
 * Monaco declares `hideCopyButton` as optional on its own `IEditorHoverParticipant`.
 */
export interface IEditorHoverParticipant {
  hideCopyButton?: boolean;
}

/**
 * Typed explicitly rather than re-exported directly: the deep `hoverTypes.js` import resolves
 * to an untyped module, so without this annotation consumers of this package land on `any`.
 * Participants are registered as classes, so `getAll()` hands back constructors, not instances.
 */
export const HoverParticipantRegistry: {
  getAll(): Array<{
    prototype: IEditorHoverParticipant;
  }>;
} = hoverParticipantRegistry;
