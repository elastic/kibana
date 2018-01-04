import LruCache from 'lru-cache';

export class SearchCache {

  constructor(es, cacheOpts) {
    this._es = es;
    this._cache = new LruCache(cacheOpts);
  }

  /**
   * Execute multiple searches, possibly combining the results of the cached searches with the new ones
   * @param {object[]} requests array of search requests, each must have index & body
   */
  async search(requests) {
    const results = [];
    const remoteRequest = [];
    const remoteMap = [];

    for (let ind = 0; ind < requests.length; ind++) {
      const request = requests[ind];
      const key = JSON.stringify(request);
      const res = this._cache.get(key);
      if (res !== undefined) {
        results.push(res);
        continue;
      }
      results.push(undefined); // reserve a spot for the reply

      // Record where the response should be placed, and its key
      // The position in the remoteMap should match the response
      remoteMap.push({ key, ind });
      remoteRequest.push(request.meta);
      remoteRequest.push(request.body);
    }

    if (remoteRequest.length > 0) {

      const remoteResponse = await this._es.msearch({ body: remoteRequest });
      const { responses } = remoteResponse;

      if (responses.length !== remoteMap.length) {
        throw new Error(`Expected ${remoteMap.length} responses, but got ${responses.length}`);
      }
      for (let i = 0; i < responses.length; i++) {
        results[remoteMap[i].ind] = responses[i];
        this._cache.set(remoteMap[i].key, responses[i]);
      }
    }

    return results;
  }
}
