/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Monaco languages support declarations
declare module 'monaco-editor/languages/definitions/markdown/markdown.js';
declare module 'monaco-editor/languages/definitions/css/css.js';
declare module 'monaco-editor/languages/definitions/yaml/yaml.js';
declare module 'monaco-editor/editor/editor.worker.start.js';
declare module 'monaco-editor/internal/common/workers.js';
declare module 'monaco-editor/editor/contrib/hover/browser/hoverTypes.js';

// Monaco internal services
declare module 'monaco-editor/editor/standalone/browser/standaloneServices.js' {
  interface StandaloneServicesType {
    get<T>(serviceId: unknown): T;
  }
  export const StandaloneServices: StandaloneServicesType;
}

declare module 'monaco-editor/platform/undoRedo/common/undoRedo.js' {
  export const IUndoRedoService: symbol;
}

declare module 'monaco-editor/platform/actions/common/actions.js' {
  export interface MenuItem {
    command?: {
      id: string;
      title: string | { value: string; original: string };
    };
    when?: {
      serialize(): string;
    };
  }

  export const MenuId: {
    EditorContext: unknown;
  };

  export const MenuRegistry: {
    getMenuItems(menuId: unknown): MenuItem[];
  };
}
