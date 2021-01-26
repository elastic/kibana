/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export function unset(object, rawPath) {
  if (!object) return;
  const path = _.toPath(rawPath);

  switch (path.length) {
    case 0:
      return;

    case 1:
      delete object[rawPath];
      break;

    default:
      const leaf = path.pop();
      const parentPath = path.slice();
      const parent = _.get(object, parentPath);
      unset(parent, leaf);
      if (!_.size(parent)) {
        unset(object, parentPath);
      }
      break;
  }
}
