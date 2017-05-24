import _ from 'lodash';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';


function fetchAnchorProvider(courier, Private) {
  const SearchSource = Private(SearchSourceProvider);

  return async function fetchAnchor(indexPatternId, uid, sort) {
    const indexPattern = await courier.indexPatterns.get(indexPatternId);

    const searchSource = new SearchSource()
      .inherits(false)
      .set('index', indexPattern)
      .set('version', true)
      .set('size', 1)
      .set('query', {
        terms: {
          _uid: [uid],
        },
      })
      .set('sort', [sort, { _uid: 'asc' }]);

    const response = await searchSource.fetch();

    if (_.get(response, ['hits', 'total'], 0) < 1) {
      throw new Error('Failed to load anchor document.');
    }

    return Object.assign(
      {},
      _.get(response, ['hits', 'hits', 0]),
      {
        $$_isAnchor: true,
      },
    );
  };
}


export {
  fetchAnchorProvider,
};
