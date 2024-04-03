/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { removeSlashes } from './remove_slashes';

export const appendAppPath = (appBasePath = '', path: string = '') => {
  // Only prepend slash if not a hash or query path
  path = path === '' || path.startsWith('#') || path.startsWith('?') ? path : `/${path}`;
  // Do not remove trailing slash when in hashbang or basePath
  const removeTrailing = path.indexOf('#') === -1 && appBasePath.indexOf('#') === -1;
  return removeSlashes(`${appBasePath}${path}`, {
    trailing: removeTrailing,
    duplicates: true,
    leading: false,
  });
};
