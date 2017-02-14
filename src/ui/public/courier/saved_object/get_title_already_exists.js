import _ from 'lodash';
/**
 * Returns true if the given saved object has a title that already exists, false otherwise.
 * @param savedObject {SavedObject} The object with the title to check.
 * @param esAdmin {Object} Used to query es
 * @returns {Promise<bool>}
 */
export function getTitleAlreadyExists(savedObject, esAdmin) {
  const { index, title, type, id } = savedObject;
  if (!title) {
    throw new Error('Title must be supplied');
  }

  const body = {
    query: {
      bool: {
        must: { match_phrase: { title } },
        must_not: { match: { id } }
      }
    }
  };

  // Elastic search will return the most relevant results first, which means exact matches should come
  // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
  const size = 10;
  return esAdmin.search({ index, type, body, size })
    .then((response) => {
      const titleMatch = _.find(response.hits.hits, function currentVersion(hit) {
        return hit._source.title === title;
      });
      return !!titleMatch;
    });
}
