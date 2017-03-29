import _ from 'lodash';

import { addComputedFields } from './utils/fields';
import { createSuccessorsQueryBody } from './utils/queries.js';
import { reverseQuerySort } from './utils/sorting';


async function fetchSuccessors(es, indexPattern, anchorDocument, sort, size) {
  const successorsQueryBody = prepareQueryBody(indexPattern, anchorDocument, sort, size);
  const results = await performQuery(es, indexPattern, successorsQueryBody);
  return results;
}

async function fetchPredecessors(es, indexPattern, anchorDocument, sort, size) {
  const successorsQueryBody = prepareQueryBody(indexPattern, anchorDocument, sort, size);
  const predecessorsQueryBody = reverseQuerySort(successorsQueryBody);
  const reversedResults = await performQuery(es, indexPattern, predecessorsQueryBody);
  const results = reversedResults.slice().reverse();
  return results;
}


function prepareQueryBody(indexPattern, anchorDocument, sort, size) {
  const successorsQueryBody = addComputedFields(
    indexPattern,
    createSuccessorsQueryBody(anchorDocument.sort, sort, size)
  );
  return successorsQueryBody;
}

async function performQuery(es, indexPattern, queryBody) {
  const indices = await indexPattern.toIndexList();

  const response = await es.search({
    index: indices,
    body: queryBody,
  });

  return _.get(response, ['hits', 'hits'], []);
}


export {
  fetchPredecessors,
  fetchSuccessors,
};
