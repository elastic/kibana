/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { VisEditorConstructor } from './application/types';

const DEFAULT_NAME = 'default';

export const createVisEditorsRegistry = () => {
  const map = new Map<string, VisEditorConstructor>();

  return {
    registerDefault: (editor: VisEditorConstructor) => {
      map.set(DEFAULT_NAME, editor);
    },
    register: (name: string, editor: VisEditorConstructor) => {
      if (name) {
        map.set(name, editor);
      }
    },
    get: (name: string) => map.get(name || DEFAULT_NAME),
  };
};

export type VisEditorsRegistry = ReturnType<typeof createVisEditorsRegistry>;
