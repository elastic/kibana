import { flatten } from 'lodash';

export async function importDashboards(req) {
  const { payload } = req;
  const overwrite = 'force' in req.query && req.query.force !== false;
  const exclude = flatten([req.query.exclude]);

  const savedObjectsClient = req.getSavedObjectsClient();

  const docs = payload.objects
    .filter(item => !exclude.includes(item.type));

  const objects = await savedObjectsClient.bulkCreate(docs, { overwrite });
  return { objects };
}
