import { SavedObjectsClient } from 'ui/saved_objects';
import { $http } from '../../../../globals';

export const fetchIndexPatterns = async () => {
  const client = new SavedObjectsClient($http);
  const indexPatterns = await client.find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000
  });
  return indexPatterns.savedObjects;
}
