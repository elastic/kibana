/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Bluebird from 'bluebird';
import _ from 'lodash';

/* @param {Array} args
 * - args[0] must be a seriesList

 * @params {Function} fn - Function to apply to each series in the seriesList
 * @return {seriesList}
 */

export default function alter(args, fn) {
  // In theory none of the args should ever be promises. This is probably a waste.
  return Bluebird.all(args)
    .then(function (args) {
      const seriesList = args.shift();

      if (seriesList.type !== 'seriesList') {
        throw new Error('args[0] must be a seriesList');
      }

      const list = _.chain(seriesList.list)
        .map(function (series) {
          return fn.apply(this, [series].concat(args));
        })
        .flatten()
        .value();

      seriesList.list = list;
      return seriesList;
    })
    .catch(function (e) {
      throw e;
    });
}
