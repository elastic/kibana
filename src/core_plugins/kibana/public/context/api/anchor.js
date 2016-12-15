import _ from 'lodash';

import { addComputedFields } from './utils/fields';
import { createAnchorQuery } from './utils/queries';


async function fetchAnchor(es, indexPattern, uid, sort) {
  const indices = await indexPattern.toIndexList();
  const response = await es.search({
    index: indices,
    body: addComputedFields(indexPattern, createAnchorQuery(uid, sort)),
  });

  if (_.get(response, ['hits', 'total'], 0) < 1) {
    throw new Error('Failed to load anchor row.');
  }

  return {
    ...response.hits.hits[0],
    $$_isAnchor: true,
  };
}


export {
  fetchAnchor,
};
