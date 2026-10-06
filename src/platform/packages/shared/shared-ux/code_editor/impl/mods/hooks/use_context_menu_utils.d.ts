/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type monaco } from '@kbn/monaco';
interface RegisterContextMenuActionsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  enableWriteActions: boolean;
  customActions?: ContextMenuAction[];
}
export interface ContextMenuAction {
  actionDescriptor: monaco.editor.IActionDescriptor;
  writeAction: boolean;
}
/**
 * Hook that returns a function for registering context menu actions in the Monaco editor.
 */
export declare const useContextMenuUtils: () => {
  registerContextMenuActions: ({
    editor,
    enableWriteActions,
    customActions,
  }: RegisterContextMenuActionsParams) => void;
  unregisterContextMenuActions: () => void;
};
export {};
