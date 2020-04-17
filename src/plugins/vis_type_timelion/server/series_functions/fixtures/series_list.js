/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import buckets from './bucket_list';
import getSeries from '../helpers/get_series';
import getSeriesList from '../helpers/get_series_list';

export default function() {
  return getSeriesList([
    getSeries('Negative', buckets, [-51, 17, 82, 20]),
    getSeries('Nice', buckets, [100, 50, 50, 20]),
    getSeries('All the same', buckets, [1, 1, 1, 1]),
    getSeries('Decimals', buckets, [3.1415926535, 2, 1.439, 0.3424235]),
    getSeries('PowerOfTen', buckets, [10, 100, 10, 1]),
  ]);
}
