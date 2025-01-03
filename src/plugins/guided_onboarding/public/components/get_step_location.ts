/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginState } from '../../common';

// regex matches everything between an opening and a closing curly braces
// and the braces themselves
const paramsWithBraces = /\{(.*?)\}/g;
// regex matches both curly braces
const curlyBraces = /[\{\}]/g;
export const getStepLocationPath = (path: string, pluginState: PluginState): string | undefined => {
  if (pluginState.activeGuide?.params) {
    let dynamicPath = path;
    const matchedParams = path.match(paramsWithBraces);
    if (matchedParams) {
      for (const param of matchedParams) {
        const paramWithoutBraces = param.replace(curlyBraces, '');
        dynamicPath = dynamicPath.replace(
          `${param}`,
          pluginState.activeGuide?.params[paramWithoutBraces]
        );
      }
      return dynamicPath;
    }
  }
  return path;
};
