import collectIndexPatterns from './collect_index_patterns';
import collectSearchSources from './collect_search_sources';
export default function collectPanels(req, dashboard) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const config = req.server.config();
  const panels = JSON.parse(dashboard._source.panelsJSON);
  const docs = panels.map(panel => {
    return {
      _index: config.get('kibana.index'),
      _type: panel.type,
      _id: panel.id
    };
  });
  return callWithRequest(req, 'mget', { body: { docs } })
    .then(resp => {
      const panelData = resp.docs;
      return Promise.all([
        collectIndexPatterns(req, panelData),
        collectSearchSources(req, panelData)
      ]).then(results => {
        return panelData
          .concat(results[0])
          .concat(results[1])
          .concat([dashboard]);
      });
    });
}
