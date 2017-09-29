import _ from 'lodash';

export function BaseParamTypeProvider() {

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
  BaseParamType.prototype.modifyAggConfigOnSearchRequestStart = function () {
  };

  return BaseParamType;
}
