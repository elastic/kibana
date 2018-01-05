import LruCache from 'lru-cache';

export class SearchCache {

  constructor(es, cacheOpts) {
    this._es = es;
    this._cache = new LruCache(cacheOpts);
  }

  /**
   * Execute multiple searches, possibly combining the results of the cached searches
   * with the new ones already in cache
   * @param {object[]} requests array of search requests
   */
  search(requests) {
    const promises = [];

    for (const request of requests) {
      const key = JSON.stringify(request);
      let pending = this._cache.get(key);
      if (pending === undefined) {
        pending = this._es.search(request);
        this._cache.set(key, pending);
      }
      promises.push(pending);
    }

    return Promise.all(promises);
  }
}
