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

export const PLUGIN_ID = 'kibanaUsageCollection';
export const PLUGIN_NAME = 'kibana_usage_collection';

/**
 * UI metric usage type
 */
export const UI_METRIC_USAGE_TYPE = 'ui_metric';

/**
 * Application Usage type
 */
export const APPLICATION_USAGE_TYPE = 'application_usage';

/**
 * The type name used within the Monitoring index to publish management stats.
 */
export const KIBANA_STACK_MANAGEMENT_STATS_TYPE = 'stack_management';

/**
 * The type name used to publish Kibana usage stats.
 * NOTE: this string shows as-is in the stats API as a field name for the kibana usage stats
 */
export const KIBANA_USAGE_TYPE = 'kibana';

/**
 * The type name used to publish Kibana usage stats in the formatted as bulk.
 */
export const KIBANA_STATS_TYPE = 'kibana_stats';
