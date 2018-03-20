import { saveToFile } from './save_to_file';

export async function retrieveAndExportDocs(objs, savedObjectsClient) {
  const response = await savedObjectsClient.bulkGet(objs);
  const objects = response.savedObjects.map(obj => {
    return {
      _id: obj.id,
      _type: obj.type,
      _source: obj.attributes
    };
  });

  saveToFile(JSON.stringify(objects, null, 2));
}
