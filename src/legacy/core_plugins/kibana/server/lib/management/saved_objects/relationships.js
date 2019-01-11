/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

async function findDashboardRelationships({ id, size, namespace, savedObjectsClient }) {
  const dashboard = await savedObjectsClient.get('dashboard', id, { namespace });
  const visualizations = [];

  // TODO: should we handle exceptions here or at the parent level?
  const panelsJSON = JSON.parse(dashboard.attributes.panelsJSON);
  if (panelsJSON) {
    const visualizationIds = panelsJSON.map(panel => panel.id);
    const visualizationResponse = await savedObjectsClient.bulkGet(
      visualizationIds.slice(0, size).map(id => ({
        id,
        type: 'visualization',
      })),
      { namespace },
    );

    visualizations.push(
      ...visualizationResponse.saved_objects.reduce((accum, object) => {
        if (!object.error) {
          accum.push({
            id: object.id,
            type: 'visualization',
            title: object.attributes.title,
          });
        }
        return accum;
      }, [])
    );
  }

  return visualizations;
}

async function findVisualizationRelationships({ id, size, namespace, savedObjectsClient }) {
  await savedObjectsClient.get('visualization', id, { namespace });
  const allDashboardsResponse = await savedObjectsClient.find({
    namespace,
    type: 'dashboard',
    fields: ['title', 'panelsJSON'],
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
            type: 'dashboard',
            title: dashboard.attributes.title,
          });
        }
      }
    }

    if (dashboards.length >= size) {
      break;
    }
  }
  return dashboards;
}

async function findSavedSearchRelationships({ id, namespace, savedObjectsClient }) {
  const allVisualizationsResponse = await savedObjectsClient.find({
    namespace,
    type: 'visualization',
    searchFields: ['savedSearchId'],
    search: id,
    fields: ['title'],
  });

  const visualizations = allVisualizationsResponse.saved_objects.reduce((accum, object) => {
    if (!object.error) {
      accum.push({
        id: object.id,
        type: 'visualization',
        title: object.attributes.title,
      });
    }
    return accum;
  }, []);

  return visualizations;
}

async function findIndexPatternRelationships({ id, size, namespace, savedObjectsClient }) {
  const [allVisualizationsResponse] = await Promise.all([
    savedObjectsClient.find({
      namespace,
      type: 'visualization',
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
        type: 'visualization',
        title: visualization.attributes.title,
      });
    }

    if (visualizations.length >= size) {
      break;
    }
  }

  return visualizations;
}

export async function findRelationships({ type, id, namespace, size, savedObjectsClient }) {
  switch (type) {
    case 'dashboard':
      return await findDashboardRelationships({ id, size, namespace, savedObjectsClient });
    case 'visualization':
      return await findVisualizationRelationships({ id, size, namespace, savedObjectsClient });
    case 'search':
      return await findSavedSearchRelationships({ id, size, namespace, savedObjectsClient });
    case 'index-pattern':
      return await findIndexPatternRelationships({ id, size, namespace, savedObjectsClient });
  }
  return [];
}
