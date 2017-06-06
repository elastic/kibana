import { chain } from 'lodash';
import moment from 'moment';

import { timePatternToWildcard } from './time_pattern_to_wildcard';
import { callIndexAliasApi } from './es_api';

/**
 *  Convert a time pattern into a list of indexes it could
 *  have matched and ones it did match.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {String} timePattern
 *  @return {Promise<Object>} object that lists the indices that match based
 *                            on a wildcard version of the time pattern (all)
 *                            and the indices that actually match the time
 *                            pattern (matches);
 */
export async function resolveTimePattern(callCluster, timePattern) {
  const aliases = await callIndexAliasApi(callCluster, timePatternToWildcard(timePattern));

  const allIndexDetails = chain(aliases)
    .reduce((acc, index, indexName) => acc.concat(
      indexName,
      Object.keys(index.aliases || {})
    ), [])
    .sort()
    .uniq(true)
    .map(indexName => {
      const parsed = moment(indexName, timePattern, true);
      if (!parsed.isValid()) {
        return {
          valid: false,
          indexName,
          order: indexName,
          isMatch: false
        };
      }

      return {
        valid: true,
        indexName,
        order: parsed,
        isMatch: indexName === parsed.format(timePattern)
      };
    })
    .sortByOrder(['valid', 'order'], ['desc', 'desc'])
    .value();

  return {
    all: allIndexDetails
      .map(details => details.indexName),

    matches: allIndexDetails
      .filter(details => details.isMatch)
      .map(details => details.indexName),
  };
}
