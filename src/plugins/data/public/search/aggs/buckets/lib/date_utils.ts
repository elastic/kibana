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

/**
 * This temporarily re-exports a static function from the data shim plugin until
 * the final agg_types cutover is complete. It is needed for use in Lens; and they
 * are not currently using the legacy data shim, so we are moving it here first.
 */
export { getCalculateAutoTimeExpression } from '../../../../../../../legacy/core_plugins/data/public/search/aggs/buckets/lib/date_utils';
