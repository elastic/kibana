import _ from 'lodash';

import { addComputedFields } from './utils/fields';
import { getDocumentUid } from './utils/ids';
import { createSuccessorsQuery } from './utils/queries.js';
import { reverseQuerySort } from './utils/sorting';


async function fetchSuccessors(es, indexPattern, anchorDocument, sort, size) {
  const successorsQuery = prepareQuery(indexPattern, anchorDocument, sort, size);
  const results = await performQuery(es, indexPattern, successorsQuery);
  return results;
}

async function fetchPredecessors(es, indexPattern, anchorDocument, sort, size) {
  const successorsQuery = prepareQuery(indexPattern, anchorDocument, sort, size);
  const predecessorsQuery = reverseQuerySort(successorsQuery);
  const reversedResults = await performQuery(es, indexPattern, predecessorsQuery);
  const results = reverseResults(reversedResults);
  return results;
}


function prepareQuery(indexPattern, anchorDocument, sort, size) {
  const successorsQuery = addComputedFields(
    indexPattern,
    createSuccessorsQuery(anchorDocument.sort, sort, size)
  );
  return successorsQuery;
}

async function performQuery(es, indexPattern, query) {
  const indices = await indexPattern.toIndexList();

  const response = await es.search({
    index: indices,
    body: query,
  });

  return _.get(response, ['hits', 'hits'], []);
}

function reverseResults(results) {
  results.reverse();
  return results;
}


export {
  fetchPredecessors,
  fetchSuccessors,
};
