import {
  getFieldCapabilities,
  resolveTimePattern,
  createNoMatchingIndicesError,
} from './lib';

export class IndexPatternsService {
  constructor(callDataCluster) {
    this._callDataCluster = callDataCluster;
  }

  /**
   *  Get a list of field objects for an index pattern that may contain wildcards
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The moment compatible time pattern
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForWildcard(options = {}) {
    const { pattern, metaFields } = options;
    return await getFieldCapabilities(this._callDataCluster, pattern, metaFields);
  }

  /**
   *  Get a list of field objects for a time pattern
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The moment compatible time pattern
   *  @property {Number} options.lookBack The number of indices we will pull mappings for
   *  @property {Number} options.metaFields The list of underscore prefixed fields that should
   *                                        be left in the field list (all others are removed).
   *  @return {Promise<Array<Fields>>}
   */
  async getFieldsForTimePattern(options = {}) {
    const { pattern, lookBack, metaFields } = options;
    const { matches } = await resolveTimePattern(this._callDataCluster, pattern);
    const indices = matches.slice(0, lookBack);
    if (indices.length === 0) {
      throw createNoMatchingIndicesError(pattern);
    }
    return await getFieldCapabilities(this._callDataCluster, indices, metaFields);
  }

}
