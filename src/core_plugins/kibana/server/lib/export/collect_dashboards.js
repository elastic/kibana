import collectPanels from './collect_panels';

export const deps = {
  collectPanels
};

export default function collectDashboards(savedObjectsClient, ids) {

  if (ids.length === 0) return Promise.resolve([]);

  return savedObjectsClient.bulkGet(ids, 'dashboard')
    .then(docs => Promise.all(docs.map(d => deps.collectPanels(savedObjectsClient, d))))
    .then(results => {
      return results
        .reduce((acc, result) => acc.concat(result), [])
        .reduce((acc, obj) => {
          if (!acc.find(o => o.id === obj.id))  acc.push(obj);
          return acc;
        }, []);
    });
}
