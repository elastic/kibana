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

export enum BUCKET_TYPES {
  FILTER = 'filter',
  HISTOGRAM = 'histogram',
  IP_RANGE = 'ip_range',
  DATE_RANGE = 'date_range',
  RANGE = 'range',
  TERMS = 'terms',
  SIGNIFICANT_TERMS = 'significant_terms',
  GEOHASH_GRID = 'geohash_grid',
  GEOTILE_GRID = 'geotile_grid',
  DATE_HISTOGRAM = 'date_histogram',
}
