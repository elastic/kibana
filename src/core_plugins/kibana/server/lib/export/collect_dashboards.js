import { collectPanels } from './collect_panels';

export async function collectDashboards(savedObjectsClient, ids) {

  if (ids.length === 0) return [];

  const objects = ids.map(id => {
    return {
      type: 'dashboard',
      id: id
    };
  });

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(objects);
  const results = await Promise.all(savedObjects.map(d => collectPanels(savedObjectsClient, d)));

  return results
    .reduce((acc, result) => acc.concat(result), [])
    .reduce((acc, obj) => {
      if (!acc.find(o => o.id === obj.id))  acc.push(obj);
      return acc;
    }, []);

}
