/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

function toPojo(obj: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(obj));
}

function replacer(match: string, group: any[]) {
  return new Array(group.length + 1).join('X');
}

function apply(obj: Record<string, unknown>, key: string, action: string) {
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      let val = obj[k];
      if (k === key) {
        if (action === 'remove') {
          delete obj[k];
        } else if (action === 'censor' && typeof val === 'object') {
          delete obj[key];
        } else if (action === 'censor') {
          obj[k] = ('' + val).replace(/./g, 'X');
        } else if (/\/.+\//.test(action)) {
          const matches = action.match(/\/(.+)\//);
          if (matches) {
            const regex = new RegExp(matches[1]);
            obj[k] = ('' + val).replace(regex, replacer);
          }
        }
      } else if (typeof val === 'object') {
        val = apply(val as Record<string, any>, key, action);
      }
    }
  }
  return obj;
}

export function applyFiltersToKeys(
  obj: Record<string, unknown>,
  actionsByKey: Record<string, string>
) {
  return Object.keys(actionsByKey).reduce((output, key) => {
    return apply(output, key, actionsByKey[key]);
  }, toPojo(obj));
}
