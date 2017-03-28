import collectIndexPatterns from './collect_index_patterns';
export const deps = { collectIndexPatterns };
export default function collectSearchSources(req, panels) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const config = req.server.config();

  const ids = panels.reduce((acc, panel) => {
    const { savedSearchId } = panel._source;
    if (savedSearchId) {
      if (!acc.find(s => s === savedSearchId) && !panels.find(p => p._id === savedSearchId)) {
        acc.push(savedSearchId);
      }
    }
    return acc;
  }, []);

  if (!ids.length) {
    return Promise.resolve([]);
  }

  const params = {
    index: config.get('kibana.index'),
    type: 'search',
    body: { ids }
  };

  return callWithRequest(req, 'mget', params).then(resp => resp.docs).then(savedSearches => {
    return deps.collectIndexPatterns(req, savedSearches)
      .then(resp => {
        return savedSearches.concat(resp);
      });
  });

}
