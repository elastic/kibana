function formatId(id) {
  return id.split(':')[1];
}

async function findDashboardRelationships(id, size, callCluster, savedObjectsClient) {
  const kibanaIndex = savedObjectsClient._index;
  const dashboard = await savedObjectsClient.get('dashboard', id);
  const visualizations = [];

  // TODO: should we handle exceptions here or at the parent level?
  const panelsJSON = JSON.parse(dashboard.attributes.panelsJSON);
  if (panelsJSON) {
    const visualizationIds = panelsJSON.map(panel => panel.id);
    const visualizationResponse = await callCluster('mget', {
      body: {
        docs: visualizationIds.slice(0, size).map(id => ({
          _index: kibanaIndex,
          _type: 'doc',
          _id: `visualization:${id}`,
          _source: [`visualization.title`]
        }))
      }
    });

    visualizations.push(...visualizationResponse.docs.reduce((accum, doc) => {
      if (doc.found) {
        accum.push({
          id: formatId(doc._id),
          title: doc._source.visualization.title,
        });
      }
      return accum;
    }, []));
  }

  return { visualizations };
}

async function findVisualizationRelationships(id, size, callCluster, savedObjectsClient) {
  const kibanaIndex = savedObjectsClient._index;
  const allDashboardsResponse = await callCluster('search', {
    index: kibanaIndex,
    size: 10000,
    ignore: [404],
    _source: [`dashboard.title`, `dashboard.panelsJSON`],
    body: {
      query: {
        term: {
          type: 'dashboard'
        }
      }
    }
  });

  const dashboards = [];
  for (const dashboard of allDashboardsResponse.hits.hits) {
    const panelsJSON = JSON.parse(dashboard._source.dashboard.panelsJSON);
    if (panelsJSON) {
      for (const panel of panelsJSON) {
        if (panel.type === 'visualization' && panel.id === id) {
          dashboards.push({
            id: formatId(dashboard._id),
            title: dashboard._source.dashboard.title,
          });
        }
      }
    }

    if (dashboards.length >= size) {
      break;
    }
  }

  return { dashboards };
}

async function findSavedSearchRelationships(id, size, callCluster, savedObjectsClient) {
  const kibanaIndex = savedObjectsClient._index;
  const search = await savedObjectsClient.get('search', id);

  const searchSourceJSON = JSON.parse(search.attributes.kibanaSavedObjectMeta.searchSourceJSON);

  let indexPatterns = [];
  try {
    const indexPattern = await savedObjectsClient.get('index-pattern', searchSourceJSON.index);
    indexPatterns = [{ id: indexPattern.id, title: indexPattern.attributes.title }];
  } catch (err) {
    // Do nothing
  }

  const allVisualizationsResponse = await callCluster('search', {
    index: kibanaIndex,
    size,
    ignore: [404],
    _source: [`visualization.title`],
    body: {
      query: {
        term: {
          'visualization.savedSearchId': id,
        }
      }
    }
  });

  const visualizations = allVisualizationsResponse.hits.hits.map(response => ({
    id: formatId(response._id),
    title: response._source.visualization.title,
  }));

  return { visualizations, indexPatterns };
}

async function findIndexPatternRelationships(id, size, callCluster, savedObjectsClient) {
  const kibanaIndex = savedObjectsClient._index;

  const [allVisualizationsResponse, savedSearchResponse] = await Promise.all([
    callCluster('search', {
      index: kibanaIndex,
      size: 10000,
      ignore: [404],
      _source: [`visualization.title`, `visualization.kibanaSavedObjectMeta.searchSourceJSON`],
      body: {
        query: {
          bool: {
            filter: {
              exists: {
                field: 'visualization.kibanaSavedObjectMeta.searchSourceJSON',
              }
            },
            must: [
              {
                term: {
                  type: {
                    value: 'visualization',
                  }
                }
              }
            ]
          }
        }
      }
    }),
    callCluster('search', {
      index: kibanaIndex,
      size: 10000,
      ignore: [404],
      _source: [`search.title`, `search.kibanaSavedObjectMeta.searchSourceJSON`],
      body: {
        query: {
          bool: {
            filter: {
              exists: {
                field: 'search.kibanaSavedObjectMeta.searchSourceJSON',
              }
            },
            must: [
              {
                term: {
                  type: {
                    value: 'search',
                  }
                }
              }
            ]
          }
        }
      }
    })
  ]);

  const visualizations = [];
  for (const visualization of allVisualizationsResponse.hits.hits) {
    const searchSourceJSON = JSON.parse(visualization._source.visualization.kibanaSavedObjectMeta.searchSourceJSON);
    if (searchSourceJSON && searchSourceJSON.index === id) {
      visualizations.push({
        id: formatId(visualization._id),
        title: visualization._source.visualization.title,
      });
    }

    if (visualizations.length >= size) {
      break;
    }
  }

  const searches = [];
  for (const search of savedSearchResponse.hits.hits) {
    const searchSourceJSON = JSON.parse(search._source.search.kibanaSavedObjectMeta.searchSourceJSON);
    if (searchSourceJSON && searchSourceJSON.index === id) {
      searches.push({
        id: formatId(search._id),
        title: search._source.search.title,
      });
    }

    if (searches.length >= size) {
      break;
    }
  }

  return { visualizations, searches };
}

export async function findRelationships(type, id, size, callCluster, savedObjectsClient) {
  if (type === 'dashboard') {
    return await findDashboardRelationships(id, size, callCluster, savedObjectsClient);
  }

  if (type === 'visualization') {
    return await findVisualizationRelationships(id, size, callCluster, savedObjectsClient);
  }

  if (type === 'search') {
    return await findSavedSearchRelationships(id, size, callCluster, savedObjectsClient);
  }

  if (type === 'index-pattern') {
    return await findIndexPatternRelationships(id, size, callCluster, savedObjectsClient);
  }

  return {};
}
