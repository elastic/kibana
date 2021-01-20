/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { keys, isFunction, difference, filter, union, pick, each, assign, isEqual } from 'lodash';

export interface IDiffObject {
  removed: string[];
  added: string[];
  changed: string[];
  keys: string[];
}

/**
 * Filter the private vars
 * @param {string} key The keys
 * @returns {boolean}
 */
const filterPrivateAndMethods = function (obj: Record<string, any>) {
  return function (key: string) {
    if (isFunction(obj[key])) return false;
    if (key.charAt(0) === '$') return false;
    return key.charAt(0) !== '_';
  };
};

export function applyDiff(target: Record<string, any>, source: Record<string, any>) {
  const diff: IDiffObject = {
    removed: [],
    added: [],
    changed: [],
    keys: [],
  };

  const targetKeys = keys(target).filter(filterPrivateAndMethods(target));
  const sourceKeys = keys(source).filter(filterPrivateAndMethods(source));

  // Find the keys to be removed
  diff.removed = difference(targetKeys, sourceKeys);

  // Find the keys to be added
  diff.added = difference(sourceKeys, targetKeys);

  // Find the keys that will be changed
  diff.changed = filter(sourceKeys, (key) => !isEqual(target[key], source[key]));

  // Make a list of all the keys that are changing
  diff.keys = union(diff.changed, diff.removed, diff.added);

  // Remove all the keys
  each(diff.removed, (key) => {
    delete target[key];
  });

  // Assign the changed to the source to the target
  assign(target, pick(source, diff.changed));
  // Assign the added to the source to the target
  assign(target, pick(source, diff.added));

  return diff;
}
