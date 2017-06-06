import { collectPanels } from './collect_panels';

export function collectDashboards(savedObjectsClient, ids) {

  if (ids.length === 0) return Promise.resolve([]);

  const objects = ids.map(id => {
    return {
      type: 'dashboard',
      id: id
    };
  });

  return savedObjectsClient.bulkGet(objects)
    .then(docs => Promise.all(docs.map(d => collectPanels(savedObjectsClient, d))))
    .then(results => {
      return results
        .reduce((acc, result) => acc.concat(result), [])
        .reduce((acc, obj) => {
          if (!acc.find(o => o.id === obj.id))  acc.push(obj);
          return acc;
        }, []);
    });
}
