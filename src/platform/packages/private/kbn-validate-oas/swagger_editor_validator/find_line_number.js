/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml-js';
import _ from 'lodash';

const MAP_TAG = 'tag:yaml.org,2002:map';
const SEQ_TAG = 'tag:yaml.org,2002:seq';

export function getLineNumberForPath(yaml, path) {
  // Type check
  if (typeof yaml !== 'string') {
    throw new TypeError('yaml should be a string');
  }
  if (!Array.isArray(path)) {
    throw new TypeError('path should be an array of strings');
  }

  let i = 0;

  const ast = YAML.compose(yaml);

  // simply walks the tree using current path recursively to the point that
  // path is empty

  return find(ast, path);

  function find(current, path, last) {
    if (!current) {
      // something has gone quite wrong
      // return the last start_mark as a best-effort
      if (last && last.start_mark) return last.start_mark.line;
      return 0;
    }

    if (path.length && current.tag === MAP_TAG) {
      for (i = 0; i < current.value.length; i++) {
        const pair = current.value[i];
        const key = pair[0];
        const value = pair[1];

        if (key.value === path[0]) {
          return find(value, path.slice(1), current);
        }

        if (key.value === path[0].replace(/\[.*/, '')) {
          // access the array at the index in the path (example: grab the 2 in "tags[2]")
          const index = parseInt(path[0].match(/\[(.*)\]/)[1]);
          let nextVal;
          if (value.value.length === 1 && index !== 0 && !!index) {
            nextVal = _.find(value.value[0], { value: index.toString() });
          } else {
            nextVal = value.value[index];
          }
          return find(nextVal, path.slice(1), value.value);
        }
      }
    }

    if (path.length && current.tag === SEQ_TAG) {
      const item = current.value[path[0]];

      if (item && item.tag) {
        return find(item, path.slice(1), current.value);
      }
    }

    if (current.tag === MAP_TAG && !Array.isArray(last)) {
      return current.start_mark.line;
    } else {
      return current.start_mark.line + 1;
    }
  }
}
