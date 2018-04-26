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
