/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/**
 * move an obj either up or down in the collection by
 * injecting it either before/after the prev/next obj that
 * satisfied the qualifier
 *
 * or, just from one index to another...
 *
 * @param  {array} objs - the list to move the object within
 * @param  {number|any} obj - the object that should be moved, or the index that the object is currently at
 * @param  {number|boolean} below - the index to move the object to, or whether it should be moved up or down
 * @param  {function} qualifier - a lodash-y callback, object = _.where, string = _.pluck
 * @return {array} - the objs argument
 */
export function move(
  objs: any[],
  obj: object | number,
  below: number | boolean,
  qualifier?: ((object: object, index: number) => any) | Record<string, any> | string
): object[] {
  const origI = _.isNumber(obj) ? obj : objs.indexOf(obj);
  if (origI === -1) {
    return objs;
  }

  if (_.isNumber(below)) {
    // move to a specific index
    objs.splice(below, 0, objs.splice(origI, 1)[0]);
    return objs;
  }

  below = !!below;
  qualifier = qualifier && _.iteratee(qualifier);

  const above = !below;
  const finder = below ? _.findIndex : _.findLastIndex;

  // find the index of the next/previous obj that meets the qualifications
  const targetI = finder(objs, (otherAgg, otherI) => {
    if (below && otherI <= origI) {
      return;
    }
    if (above && otherI >= origI) {
      return;
    }
    return Boolean(_.isFunction(qualifier) && qualifier(otherAgg, otherI));
  });

  if (targetI === -1) {
    return objs;
  }

  // place the obj at it's new index
  objs.splice(targetI, 0, objs.splice(origI, 1)[0]);
  return objs;
}
