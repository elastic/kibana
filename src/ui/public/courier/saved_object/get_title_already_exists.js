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
        must: [{ match: { title } }],
        must_not: [{ match: { id } }]
      }
    }
  };

  const size = 0;
  return esAdmin.search({ index, type, body, size })
    .then((response) => {
      return response.hits.total > 0 ? true : false;
    });
}
