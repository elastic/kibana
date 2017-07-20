import { search } from './lib';

export class IndicesService {
  constructor(callDataCluster) {
    this._callDataCluster = callDataCluster;
  }

  /**
   *  Searches for indices through the _search api endpoint
   *
   *  @param {Object} [options={}]
   *  @property {String} options.pattern The pattern to match against known indices
   *  @property {Number} options.maxNumberOfMatchingIndices The limit of indices to return
   *  @return {Promise<Array<Indices>>}
   */
  async search(options = {}) {
    const { pattern, maxNumberOfMatchingIndices } = options;
    return await search(this._callDataCluster, pattern, maxNumberOfMatchingIndices);
  }
}
