import _ from 'lodash';
/**
 * Returns true if the given saved object has a title that already exists, false otherwise. Search is case
 * insensitive.
 * @param savedObject {SavedObject} The object with the title to check.
 * @param esAdmin {Object} Used to query es
 * @returns {Promise<string|undefined>} Returns the title that matches. Because this search is not case
 * sensitive, it may not exactly match the title of the object.
 */
export function getTitleAlreadyExists(savedObject, esAdmin) {
  const { index, title, id } = savedObject;
  const esType = savedObject.getEsType();
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
  return esAdmin.search({ index, type: esType, body, size })
    .then((response) => {
      const match = _.find(response.hits.hits, function currentVersion(hit) {
        return hit._source.title.toLowerCase() === title.toLowerCase();
      });
      return match ? match._source.title : undefined;
    });
}
