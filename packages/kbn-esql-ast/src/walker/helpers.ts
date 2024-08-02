/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLProperNode } from '../types';

export const templateToPredicate = (
  template: Partial<ESQLProperNode>
): ((node: ESQLProperNode) => boolean) => {
  const keys = Object.keys(template) as Array<keyof ESQLProperNode>;
  const predicate = (child: ESQLProperNode) => {
    for (const key of keys) {
      const matcher = template[key];
      if (matcher instanceof Array) {
        if (!matcher.includes(child[key])) {
          return false;
        }
      } else if (matcher instanceof RegExp) {
        if (!matcher.test(String(child[key]))) {
          return false;
        }
      } else if (child[key] !== matcher) {
        return false;
      }
    }
    return true;
  };

  return predicate;
};
