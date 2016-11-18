import _ from 'lodash';

import {addComputedFields} from './utils/fields';
import {getDocumentUid} from './utils/ids';
import {createSuccessorsQuery} from './utils/queries.js';
import {reverseQuerySort} from './utils/sorting';


async function fetchContext(es, indexPattern, anchorDocument, sort, size) {
  const indices = await indexPattern.toIndexList();
  const anchorUid = getDocumentUid(anchorDocument._type, anchorDocument._id);
  const successorsQuery = addComputedFields(
    indexPattern,
    createSuccessorsQuery(anchorUid, anchorDocument.sort, sort, size)
  );
  const predecessorsQuery = reverseQuerySort(successorsQuery);

  const response = await es.msearch({
    body: [
      {index: indices},
      predecessorsQuery,
      {index: indices},
      successorsQuery,
    ],
  });

  const predecessors = _.get(response, ['responses', 0, 'hits', 'hits'], []);
  const successors = _.get(response, ['responses', 1, 'hits', 'hits'], []);

  predecessors.reverse();

  return {
    predecessors,
    successors,
  };
}


export {
  fetchContext,
};
