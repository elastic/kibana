import collectPanels from './collect_panels';

export const deps = {
  collectPanels
};

export default function collectDashboards(req, ids) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const config = req.server.config();
  if (ids.length === 0) return Promise.resolve([]);
  const params = {
    index: config.get('kibana.index'),
    type: 'dashboard',
    body: { ids }
  };
  return callWithRequest(req, 'mget', params)
    .then(resp => resp.docs.filter(d => d.found))
    .then(docs => Promise.all(docs.map(d => deps.collectPanels(req, d))))
    .then(results => {
      return results
        .reduce((acc, result) => acc.concat(result), [])
        .reduce((acc, obj) => {
          if (!acc.find(o => o._id === obj._id))  acc.push(obj);
          return acc;
        }, []);
    });
}

