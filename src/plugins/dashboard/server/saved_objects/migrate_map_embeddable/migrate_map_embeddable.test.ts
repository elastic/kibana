/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsServiceMock } from '../../../../../core/server/mocks';
import { migrateMapEmbeddable } from './migrate_map_embeddable';

test('Should extract references from by-value map panels', () => {
  const dashboard = {
    id: 'cf56e3f0-8de8-11ec-975f-f7e09cf7ebaf',
    type: 'dashboard',
    attributes: {
      description: '',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      optionsJSON: '{"useMargins":true,"syncColors":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.0.0","type":"map","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"6c75ee1d-28d9-4eea-8816-4110f3d8c154"},"panelIndex":"6c75ee1d-28d9-4eea-8816-4110f3d8c154","embeddableConfig":{"attributes":{"title":"","description":"","layerListJSON":"[{\\"sourceDescriptor\\":{\\"indexPatternId\\":\\"90943e30-9a47-11e8-b64d-95841ca0b247\\",\\"geoField\\":\\"geo.coordinates\\",\\"filterByMapBounds\\":true,\\"scalingType\\":\\"LIMIT\\",\\"id\\":\\"76e10a23-70b3-43a6-9476-7480a525aced\\",\\"type\\":\\"ES_SEARCH\\",\\"applyGlobalQuery\\":true,\\"applyGlobalTime\\":true,\\"applyForceRefresh\\":true,\\"tooltipProperties\\":[],\\"sortField\\":\\"\\",\\"sortOrder\\":\\"desc\\",\\"topHitsSplitField\\":\\"\\",\\"topHitsSize\\":1},\\"id\\":\\"14acaa6e-3a3a-419e-9080-28c8d64626ab\\",\\"label\\":null,\\"minZoom\\":0,\\"maxZoom\\":24,\\"alpha\\":0.75,\\"visible\\":true,\\"style\\":{\\"type\\":\\"VECTOR\\",\\"properties\\":{\\"icon\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"value\\":\\"marker\\"}},\\"fillColor\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"color\\":\\"#54B399\\"}},\\"lineColor\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"color\\":\\"#41937c\\"}},\\"lineWidth\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"size\\":1}},\\"iconSize\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"size\\":6}},\\"iconOrientation\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"orientation\\":0}},\\"labelText\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"value\\":\\"\\"}},\\"labelColor\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"color\\":\\"#000000\\"}},\\"labelSize\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"size\\":14}},\\"labelBorderColor\\":{\\"type\\":\\"STATIC\\",\\"options\\":{\\"color\\":\\"#FFFFFF\\"}},\\"symbolizeAs\\":{\\"options\\":{\\"value\\":\\"circle\\"}},\\"labelBorderSize\\":{\\"options\\":{\\"size\\":\\"SMALL\\"}}},\\"isTimeAware\\":true},\\"includeInFitToBounds\\":true,\\"type\\":\\"VECTOR\\",\\"joins\\":[]}]","mapStateJSON":"{\\"zoom\\":2.46,\\"center\\":{\\"lon\\":-116.80747,\\"lat\\":54.63368},\\"timeFilters\\":{\\"from\\":\\"now-24h/h\\",\\"to\\":\\"now\\"},\\"refreshConfig\\":{\\"isPaused\\":true,\\"interval\\":0},\\"query\\":{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"},\\"filters\\":[],\\"settings\\":{\\"autoFitToDataBounds\\":false,\\"backgroundColor\\":\\"#ffffff\\",\\"disableInteractive\\":false,\\"disableTooltipControl\\":false,\\"hideToolbarOverlay\\":false,\\"hideLayerControl\\":false,\\"hideViewControl\\":false,\\"initialLocation\\":\\"LAST_SAVED_LOCATION\\",\\"fixedLocation\\":{\\"lat\\":0,\\"lon\\":0,\\"zoom\\":2},\\"browserLocation\\":{\\"zoom\\":2},\\"maxZoom\\":24,\\"minZoom\\":0,\\"showScaleControl\\":false,\\"showSpatialFilters\\":true,\\"showTimesliderToggleButton\\":true,\\"spatialFiltersAlpa\\":0.3,\\"spatialFiltersFillColor\\":\\"#DA8B45\\",\\"spatialFiltersLineColor\\":\\"#DA8B45\\"}}","uiStateJSON":"{\\"isLayerTOCOpen\\":true,\\"openTOCDetails\\":[]}"},"mapCenter":{"lat":54.63368,"lon":-116.80747,"zoom":2.46},"mapBuffer":{"minLon":-225,"minLat":0,"maxLon":-45,"maxLat":79.17133},"isLayerTOCOpen":true,"openTOCDetails":[],"hiddenLayers":[],"enhancements":{},"type":"map"}}]',
      timeRestore: false,
      title: 'by value map',
      version: 1,
    },
    migrationVersion: { dashboard: '8.0.0' },
    coreMigrationVersion: '8.0.0',
    namespaces: ['default'],
    updated_at: '2022-02-15T18:04:14.790Z',
    references: [
      {
        id: '90943e30-9a47-11e8-b64d-95841ca0b247',
        name: '6c75ee1d-28d9-4eea-8816-4110f3d8c154:layer_1_source_index_pattern',
        type: 'index-pattern',
      },
    ],
    originId: undefined,
  };

  const contextMock = savedObjectsServiceMock.createMigrationContext();
  const updated = migrateMapEmbeddable(dashboard, contextMock);
  expect(updated.references).toEqual([
    {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: '6c75ee1d-28d9-4eea-8816-4110f3d8c154:layer_1_source_index_pattern',
      type: 'index-pattern',
    },
    {
      name: '6c75ee1d-28d9-4eea-8816-4110f3d8c154_layer_0_source_index_pattern',
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    },
  ]);

  const panels = JSON.parse(updated.attributes.panelsJSON);
  const layerList = JSON.parse(panels[0].embeddableConfig.attributes.layerListJSON);
  expect(layerList[0].sourceDescriptor.indexPatternRefName).toEqual(
    '6c75ee1d-28d9-4eea-8816-4110f3d8c154_layer_0_source_index_pattern'
  );
});
