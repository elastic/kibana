import _ from 'lodash';

import { addComputedFields } from './utils/fields';
import { createAnchorQueryBody } from './utils/queries';


async function fetchAnchor(es, indexPattern, uid, sort) {
  const indices = await indexPattern.toIndexList();
  const queryBody = addComputedFields(indexPattern, createAnchorQueryBody(uid, sort));
  const response = await es.search({
    index: indices,
    body: queryBody,
  });

  if (_.get(response, ['hits', 'total'], 0) < 1) {
    throw new Error('Failed to load anchor document.');
  }

  return Object.assign(
    {},
    response.hits.hits[0],
    {
      $$_isAnchor: true,
    },
  );
}


export {
  fetchAnchor,
};
