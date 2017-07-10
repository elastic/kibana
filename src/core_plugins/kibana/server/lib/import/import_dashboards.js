import { flatten } from 'lodash';

export async function importDashboards(req) {
  const { payload } = req;
  const config = req.server.config();
  const overwrite = 'force' in req.query && req.query.force !== false;
  const exclude = flatten([req.query.exclude]);

  const savedObjectsClient = req.getSavedObjectsClient();

  if (payload.version !== config.get('pkg.version')) {
    throw new Error(`Version ${payload.version} does not match ${config.get('pkg.version')}.`);
  }

  const docs = payload.objects
    .filter(item => !exclude.includes(item.type));

  const objects = await savedObjectsClient.bulkCreate(docs, { overwrite });
  return { objects };
}
