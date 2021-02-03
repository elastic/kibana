/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

/**
 * Returns an array of names ordered by appearance in the nested array
 * of objects
 *
 * > Duplicated utilty method from vislib Data class to decouple `vislib_vis_legend` from `vislib`
 *
 * @see src/plugins/vis_type_vislib/public/vislib/lib/data.js
 *
 * @returns {Array} Array of unique names (strings)
 */
export function getPieNames(data: any[]): string[] {
  const names: string[] = [];

  _.forEach(data, function (obj) {
    const columns = obj.raw ? obj.raw.columns : undefined;
    _.forEach(getNames(obj, columns), function (name) {
      names.push(name);
    });
  });

  return _.uniqBy(names, 'label');
}

/**
 * Flattens hierarchical data into an array of objects with a name and index value.
 * The indexed value determines the order of nesting in the data.
 * Returns an array with names sorted by the index value.
 *
 * @param data {Object} Chart data object
 * @param columns {Object} Contains formatter information
 * @returns {Array} Array of names (strings)
 */
function getNames(data: any, columns: any): string[] {
  const slices = data.slices;

  if (slices.children) {
    const namedObj = returnNames(slices.children, 0, columns);

    return _(namedObj)
      .sortBy(function (obj) {
        return obj.index;
      })
      .uniqBy(function (d) {
        return d.label;
      })
      .value();
  }

  return [];
}

/**
 * Helper function for getNames
 * Returns an array of objects with a name (key) value and an index value.
 * The index value allows us to sort the names in the correct nested order.
 *
 * @param array {Array} Array of data objects
 * @param index {Number} Number of times the object is nested
 * @param columns {Object} Contains name formatter information
 * @returns {Array} Array of labels (strings)
 */
function returnNames(array: any[], index: number, columns: any): any[] {
  const names: any[] = [];

  _.forEach(array, function (obj) {
    names.push({
      label: obj.name,
      values: [obj.rawData],
      index,
    });

    if (obj.children) {
      const plusIndex = index + 1;

      _.forEach(returnNames(obj.children, plusIndex, columns), function (namedObj) {
        names.push(namedObj);
      });
    }
  });

  return names;
}
