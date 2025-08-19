/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { types as babel } from '@babel/core';
import { addDataPathAttributePlugin as plugin } from '@kbn/babel-data-path';
import type { PluginObj } from '@babel/core';
import type { PluginState } from '@kbn/babel-data-path';

export const addDataPathAttributePlugin = (): PluginObj<PluginState> => {
  return {
    visitor: {
      JSXOpeningElement(nodePath, state) {
        plugin({
          babel,
          nodePath,
          state,
        });
      },
      VariableDeclarator(path, state) {
        const initPath = path.get('init');
        if (initPath.isJSXElement()) {
          const openingElementPath = initPath.get('openingElement');
          if (
            openingElementPath &&
            !Array.isArray(openingElementPath) &&
            openingElementPath.isJSXOpeningElement()
          ) {
            plugin({
              babel,
              state,
              nodePath: openingElementPath,
            });
          }
        }
      },
    },
  };
};
