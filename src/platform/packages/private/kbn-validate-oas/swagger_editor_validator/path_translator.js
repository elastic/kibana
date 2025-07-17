/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import get from 'lodash/get';

export function transformPathToArray(property, jsSpec) {
  let str;
  if (property.slice(0, 9) === 'instance.') {
    str = property.slice(9);
  } else {
    str = property;
  }

  const pathArr = [];

  // replace '.', '["', '"]' separators with pipes
  str = str.replace(/\.(?![^["]*"])|(\[")|("]\.?)/g, '|');

  // handle single quotes as well
  str = str.replace(/\['/g, '|');
  str = str.replace(/']/g, '|');

  // split on our new delimiter, pipe
  str = str.split('|');

  str
    .map((item) => {
      // "key[0]" becomes ["key", "0"]
      if (item.indexOf('[') > -1) {
        const index = parseInt(item.match(/\[(.*)\]/)[1]);
        const keyName = item.slice(0, item.indexOf('['));
        return [keyName, index.toString()];
      } else {
        return item;
      }
    })
    .reduce(function (a, b) {
      // flatten!
      return a.concat(b);
    }, [])
    .concat(['']) // add an empty item into the array, so we don't get stuck with something in our buffer below
    .reduce((buffer, curr) => {
      const obj = pathArr.length ? get(jsSpec, pathArr) : jsSpec;

      if (get(obj, makeAccessArray(buffer, curr))) {
        if (buffer.length) {
          pathArr.push(buffer);
        }
        if (curr.length) {
          pathArr.push(curr);
        }
        return '';
      } else {
        // attach key to buffer
        return `${buffer}${buffer.length ? '.' : ''}${curr}`;
      }
    }, '');

  if (typeof get(jsSpec, pathArr) !== 'undefined') {
    return pathArr;
  } else {
    // if our path is not correct (there is no value at the path),
    // return null
    return null;
  }
}

function makeAccessArray(buffer, curr) {
  const arr = [];

  if (buffer.length) {
    arr.push(buffer);
  }

  if (curr.length) {
    arr.push(curr);
  }

  return arr;
}
