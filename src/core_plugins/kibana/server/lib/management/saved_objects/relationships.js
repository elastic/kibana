async function findDashboardRelationships(id, size, savedObjectsClient) {
  const dashboard = await savedObjectsClient.get('dashboard', id);
  const visualizations = [];

  // TODO: should we handle exceptions here or at the parent level?
  const panelsJSON = JSON.parse(dashboard.attributes.panelsJSON);
  if (panelsJSON) {
    const visualizationIds = panelsJSON.map(panel => panel.id);
    const visualizationResponse = await savedObjectsClient.bulkGet(visualizationIds.slice(0, size).map(id => ({
      id,
      type: 'visualization',
    })));

    visualizations.push(...visualizationResponse.saved_objects.reduce((accum, object) => {
      if (!object.error) {
        accum.push({
          id: object.id,
          title: object.attributes.title,
        });
      }
      return accum;
    }, []));
  }

  return { visualizations };
}

async function findVisualizationRelationships(id, size, savedObjectsClient) {
  const allDashboardsResponse = await savedObjectsClient.find({
    type: 'dashboard',
    fields: ['title', 'panelsJSON']
  });

  const dashboards = [];
  for (const dashboard of allDashboardsResponse.saved_objects) {
    if (dashboard.error) {
      continue;
    }
    const panelsJSON = JSON.parse(dashboard.attributes.panelsJSON);
    if (panelsJSON) {
      for (const panel of panelsJSON) {
        if (panel.type === 'visualization' && panel.id === id) {
          dashboards.push({
            id: dashboard.id,
            title: dashboard.attributes.title,
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

async function findSavedSearchRelationships(id, size, savedObjectsClient) {
  const search = await savedObjectsClient.get('search', id);

  const searchSourceJSON = JSON.parse(search.attributes.kibanaSavedObjectMeta.searchSourceJSON);

  const indexPatterns = [];
  try {
    const indexPattern = await savedObjectsClient.get('index-pattern', searchSourceJSON.index);
    indexPatterns.push({ id: indexPattern.id, title: indexPattern.attributes.title });
  } catch (err) {
    // Do nothing
  }

  const allVisualizationsResponse = await savedObjectsClient.find({
    type: 'visualization',
    searchFields: ['savedSearchId'],
    search: id,
    fields: ['title']
  });

  const visualizations = allVisualizationsResponse.saved_objects.reduce((accum, object) => {
    if (!object.error) {
      accum.push({
        id: object.id,
        title: object.attributes.title,
      });
    }
    return accum;
  }, []);

  return { visualizations, indexPatterns };
}

async function findIndexPatternRelationships(id, size, savedObjectsClient) {
  const [allVisualizationsResponse, savedSearchResponse] = await Promise.all([
    savedObjectsClient.find({
      type: 'visualization',
      searchFields: ['kibanaSavedObjectMeta.searchSourceJSON'],
      search: '*',
      fields: [`title`, `kibanaSavedObjectMeta.searchSourceJSON`],
    }),
    savedObjectsClient.find({
      type: 'search',
      searchFields: ['kibanaSavedObjectMeta.searchSourceJSON'],
      search: '*',
      fields: [`title`, `kibanaSavedObjectMeta.searchSourceJSON`],
    }),
  ]);

  const visualizations = [];
  for (const visualization of allVisualizationsResponse.saved_objects) {
    if (visualization.error) {
      continue;
    }
    const searchSourceJSON = JSON.parse(visualization.attributes.kibanaSavedObjectMeta.searchSourceJSON);
    if (searchSourceJSON && searchSourceJSON.index === id) {
      visualizations.push({
        id: visualization.id,
        title: visualization.attributes.title,
      });
    }

    if (visualizations.length >= size) {
      break;
    }
  }

  const searches = [];
  for (const search of savedSearchResponse.saved_objects) {
    if (search.error) {
      continue;
    }
    const searchSourceJSON = JSON.parse(search.attributes.kibanaSavedObjectMeta.searchSourceJSON);
    if (searchSourceJSON && searchSourceJSON.index === id) {
      searches.push({
        id: search.id,
        title: search.attributes.title,
      });
    }

    if (searches.length >= size) {
      break;
    }
  }

  return { visualizations, searches };
}

export async function findRelationships(type, id, size, savedObjectsClient) {
  switch (type) {
    case 'dashboard':
      return await findDashboardRelationships(id, size, savedObjectsClient);
    case 'visualization':
      return await findVisualizationRelationships(id, size, savedObjectsClient);
    case 'search':
      return await findSavedSearchRelationships(id, size, savedObjectsClient);
    case 'index-pattern':
      return await findIndexPatternRelationships(id, size, savedObjectsClient);
  }
  return {};
}
