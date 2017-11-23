import { flatten } from 'lodash';

export async function importDashboards(query, payload, savedObjectsService) {
  const overwrite = 'force' in query && query.force !== false;
  const exclude = flatten([query.exclude]);

  const docs = payload.objects
    .filter(item => !exclude.includes(item.type));

  const objects = await savedObjectsService.bulkCreate(docs, { overwrite });
  return { objects };
}
