/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { MAX_NUMBER_OF_MATCHING_INDICES } from '../constants';

function isSystemIndex(index) {
  if (index.startsWith('.')) {
    return true;
  }

  if (index.includes(':')) {
    return index.split(':').reduce((isSystem, index) => isSystem || isSystemIndex(index), false);
  }

  return false;
}

function filterSystemIndices(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  const acceptableIndices = isIncludingSystemIndices
    ? indices
    : // All system indices begin with a period.
      indices.filter(index => !isSystemIndex(index.name));

  return acceptableIndices.slice(0, MAX_NUMBER_OF_MATCHING_INDICES);
}

/**
 This utility is designed to do a couple of things:

 1) Take in list of indices and filter out system indices if necessary
 2) Return a `visible` list based on a priority order.

 We are passing in three separate lists because they each represent
 something slightly different.

 - `unfilteredAllIndices`
    This is the result of the initial `*` query and represents all known indices
 - `unfilteredPartialMatchedIndices`
    This is the result of searching against the query with an added `*`. This is only
    used when the query does not end in an `*` and represents potential matches in the UI
 - `unfilteredExactMatchedIndices
    This is the result of searching against a query that already ends in `*`.
    We call this `exact` matches because ES is telling us exactly what it matches
 */
export function getMatchedIndices(
  unfilteredAllIndices,
  unfilteredPartialMatchedIndices,
  unfilteredExactMatchedIndices,
  query,
  isIncludingSystemIndices
) {
  const allIndices = filterSystemIndices(unfilteredAllIndices, isIncludingSystemIndices);
  const partialMatchedIndices = filterSystemIndices(
    unfilteredPartialMatchedIndices,
    isIncludingSystemIndices
  );
  const exactMatchedIndices = filterSystemIndices(
    unfilteredExactMatchedIndices,
    isIncludingSystemIndices
  );

  // We need to pick one to show in the UI and there is a priority here
  // 1) If there are exact matches, show those as the query is good to go
  // 2) If there are no exact matches, but there are partial matches,
  // show the partial matches
  // 3) If there are no exact or partial matches, just show all indices
  let visibleIndices;
  if (exactMatchedIndices.length) {
    visibleIndices = exactMatchedIndices;
  } else if (partialMatchedIndices.length) {
    visibleIndices = partialMatchedIndices;
  } else {
    visibleIndices = allIndices;
  }

  return {
    allIndices,
    exactMatchedIndices,
    partialMatchedIndices,
    visibleIndices,
  };
}
