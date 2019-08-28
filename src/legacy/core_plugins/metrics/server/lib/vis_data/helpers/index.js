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

import { bucketTransform } from './bucket_transform';
import { getAggValue } from './get_agg_value';
import { getBucketSize } from './get_bucket_size';
import { getBucketsPath } from './get_buckets_path';
import { getDefaultDecoration } from './get_default_decoration';
import { getLastMetric } from './get_last_metric';
import { getSiblingAggValue } from './get_sibling_agg_value';
import { getSplits } from './get_splits';
import { getTimerange } from './get_timerange';
import { mapBucket } from './map_bucket';
import { parseSettings } from './parse_settings';

export const helpers = {
  bucketTransform,
  getAggValue,
  getBucketSize,
  getBucketsPath,
  getDefaultDecoration,
  getLastMetric,
  getSiblingAggValue,
  getSplits,
  getTimerange,
  mapBucket,
  parseSettings,
};
