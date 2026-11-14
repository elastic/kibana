/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, COMMON_HEADERS, DASHBOARD_API_PATH } from '../fixtures';

apiTest.describe(
  'dashboards - Lens stale data view round trip',
  { tag: tags.deploymentAgnostic },
  () => {
    const dashboardId = 'lens-stale-data-view';
    const panelId = 'metric-panel';
    const dataViewId = 'saved-data-view';
    const staleDataViewId = 'stale-data-view';
    const referenceName = 'indexpattern-datasource-layer-layer_0';
    let editorCredentials: RoleApiCredentials;
    let viewerCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
      viewerCredentials = await requestAuth.getApiKeyForViewer();
      await kbnClient.savedObjects.create({
        type: 'index-pattern',
        id: dataViewId,
        overwrite: true,
        attributes: { title: 'logs-*', timeFieldName: '@timestamp' },
      });
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: dashboardId,
        overwrite: true,
        attributes: {
          title: 'Lens stale data view',
          panelsJSON: JSON.stringify([
            {
              type: 'lens',
              panelIndex: panelId,
              gridData: { x: 0, y: 0, w: 24, h: 15, i: panelId },
              embeddableConfig: {
                attributes: {
                  title: 'Count',
                  visualizationType: 'lnsMetric',
                  references: [{ type: 'index-pattern', id: dataViewId, name: referenceName }],
                  state: {
                    query: { language: 'kuery', query: '' },
                    filters: [],
                    datasourceStates: {
                      formBased: {
                        layers: {
                          layer_0: {
                            indexPatternId: staleDataViewId,
                            columnOrder: ['count'],
                            columns: {
                              count: {
                                label: 'Count of records',
                                dataType: 'number',
                                operationType: 'count',
                                isBucketed: false,
                                sourceField: '___records___',
                              },
                            },
                          },
                        },
                      },
                    },
                    visualization: {
                      layerId: 'layer_0',
                      layerType: 'data',
                      metricAccessor: 'count',
                    },
                    internalReferences: [
                      { type: 'index-pattern', id: staleDataViewId, name: referenceName },
                    ],
                    adHocDataViews: {
                      [staleDataViewId]: {
                        title: 'missing_remote:logs-*',
                        timeFieldName: '@timestamp',
                      },
                    },
                  },
                },
              },
            },
          ]),
        },
        references: [
          { type: 'index-pattern', id: dataViewId, name: `${panelId}:${referenceName}` },
        ],
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest('preserves the saved data view through export and import', async ({ apiClient }) => {
      const headers = { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader };
      const exported = await apiClient.get(`${DASHBOARD_API_PATH}/${dashboardId}`, {
        headers,
        responseType: 'json',
      });

      expect(exported).toHaveStatusCode(200);
      expect(exported.body.data.panels).toHaveLength(1);
      expect(exported.body.data.panels[0].config.data_source).toStrictEqual({
        type: 'data_view_reference',
        ref_id: dataViewId,
      });

      const imported = await apiClient.post(DASHBOARD_API_PATH, {
        headers: { ...COMMON_HEADERS, ...editorCredentials.apiKeyHeader },
        body: exported.body.data,
        responseType: 'json',
      });

      expect(imported).toHaveStatusCode(201);
      expect(imported.body.id).not.toBe(dashboardId);

      const roundTrip = await apiClient.get(`${DASHBOARD_API_PATH}/${imported.body.id}`, {
        headers,
        responseType: 'json',
      });

      expect(roundTrip).toHaveStatusCode(200);
      expect(roundTrip.body.data.panels).toHaveLength(1);
      expect(roundTrip.body.data.panels[0].config.data_source).toStrictEqual({
        type: 'data_view_reference',
        ref_id: dataViewId,
      });
    });
  }
);
