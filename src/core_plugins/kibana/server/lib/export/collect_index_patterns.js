export default function collectIndexPatterns(req, panels) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const config = req.server.config();

  const ids = panels.reduce((acc, panel) => {
    const { kibanaSavedObjectMeta, savedSearchId } = panel._source;
    if (kibanaSavedObjectMeta && !savedSearchId) {
      const searchSource = JSON.parse(kibanaSavedObjectMeta.searchSourceJSON);
      if (!acc.find(s => s === searchSource.index)) {
        acc.push(searchSource.index);
      }
    }
    return acc;
  }, []);

  if (!ids.length) {
    return Promise.resolve([]);
  }

  const params = {
    index: config.get('kibana.index'),
    type: 'index-pattern',
    body: { ids }
  };

  return callWithRequest(req, 'mget', params).then(resp => resp.docs);

}
