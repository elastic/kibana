import { find } from 'lodash';
/**
 * Returns true if the given saved object has a title that already exists, false otherwise. Search is case
 * insensitive.
 * @param savedObject {SavedObject} The object with the title to check.
 * @param esAdmin {Object} Used to query es
 * @returns {Promise<string|undefined>} Returns the title that matches. Because this search is not case
 * sensitive, it may not exactly match the title of the object.
 */
export function getTitleAlreadyExists(savedObject, savedObjectsClient) {
  const { title, id } = savedObject;
  const type = savedObject.getEsType();
  if (!title) {
    throw new Error('Title must be supplied');
  }

  // Elastic search will return the most relevant results first, which means exact matches should come
  // first, and so we shouldn't need to request everything. Using 10 just to be on the safe side.
  const perPage = 10;
  return savedObjectsClient.find({
    type,
    perPage,
    search: title,
    searchFields: 'title',
    fields: ['title']
  }).then(response => {
    const match = find(response.savedObjects, (obj) => {
      return obj.id !== id && obj.get('title').toLowerCase() === title.toLowerCase();
    });

    return match ? match.get('title') : undefined;
  });
}
