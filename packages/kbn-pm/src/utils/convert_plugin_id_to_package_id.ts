/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function convertPluginIdToPackageId(pluginId: string) {
  if (pluginId === 'core') {
    // core is the only non-plugin
    return `@kbn/core`;
  }

  return `@kbn/${pluginId
    .split('')
    .flatMap((c) => (c.toUpperCase() === c ? `-${c.toLowerCase()}` : c))
    .join('')}-plugin`
    .replace(/-\w(-\w)+-/g, (match) => `-${match.split('-').join('')}-`)
    .replace(/-plugin-plugin$/, '-plugin');
}
