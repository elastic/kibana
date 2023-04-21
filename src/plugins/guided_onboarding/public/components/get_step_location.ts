/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginState } from '../../common';

// regex matches everything between an opening and a closing curly braces
// without matching the braces themselves
const paramsBetweenCurlyBraces = /(?<=\{)[^\{\}]+(?=\})/g;
export const getStepLocationPath = (path: string, pluginState: PluginState): string | undefined => {
  if (pluginState.activeGuide?.params) {
    let dynamicPath = path;
    const matchedParams = path.match(paramsBetweenCurlyBraces);
    if (matchedParams) {
      for (const param of matchedParams) {
        dynamicPath = dynamicPath.replace(`{${param}}`, pluginState.activeGuide?.params[param]);
      }
      return dynamicPath;
    }
  }
  return path;
};
