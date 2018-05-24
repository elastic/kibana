import _ from 'lodash';
import { saveToFile } from './';

export async function retrieveAndExportDocs(objs, savedObjectsClient) {
  const migrationStateQuery = { type: 'migration', id: 'migration-state' };
  const response = await savedObjectsClient.bulkGet([...objs, migrationStateQuery]);
  const [[migrationState], docs] = _.partition(response.savedObjects, migrationStateQuery);
  const objects = {
    migrationState: { types: _.get(migrationState, 'attributes.types') },
    docs: docs.map(obj => {
      return {
        _id: obj.id,
        _type: obj.type,
        _source: obj.attributes
      };
    })
  };

  saveToFile(JSON.stringify(objects, null, 2));
}
