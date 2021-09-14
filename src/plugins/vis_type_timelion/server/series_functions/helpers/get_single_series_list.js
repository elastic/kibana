/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getSeries from './get_series';
import getSeriesList from './get_series_list';
import _ from 'lodash';

export default function (name, data) {
  return getSeriesList([getSeries(name, _.map(data, 0), _.map(data, 1))]);
}
