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

import _ from 'lodash';

function BaseParamType(config) {
  _.assign(this, config);
}

/**
 *  A function that will be called before an aggConfig is serialized and sent to ES.
 *  Allows aggConfig to retrieve values needed for serialization by creating a {SearchRequest}
 *  Example usage: an aggregation needs to know the min/max of a field to determine an appropriate interval
 *
 *  @param {AggConfig} aggconfig
 *  @param {Courier.SearchSource} searchSource
 *  @param {Courier.SearchRequest} searchRequest
 *  @returns {Promise<undefined>|undefined}
 */
// eslint-disable-next-line no-unused-vars
BaseParamType.prototype.modifyAggConfigOnSearchRequestStart = function (aggconfig, searchSource, searchRequest) {
};

export { BaseParamType };
