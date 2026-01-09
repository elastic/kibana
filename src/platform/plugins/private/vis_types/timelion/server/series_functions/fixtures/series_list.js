/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import buckets from './bucket_list';
import getSeries from '../test_helpers/get_series';
import getSeriesList from '../test_helpers/get_series_list';

const seriesList = getSeriesList([
  getSeries('Negative', buckets, [-51, 17, 82, 20]),
  getSeries('Nice', buckets, [100, 50, 50, 20]),
  getSeries('All the same', buckets, [1, 1, 1, 1]),
  getSeries('Decimals', buckets, [3.1415926535, 2, 1.439, 0.3424235]),
  getSeries('PowerOfTen', buckets, [10, 100, 10, 1]),
]);

export default function () {
  return structuredClone(seriesList);
}
