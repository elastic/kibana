import { CoreSetup, IRouter } from '../../../../src/core/server';
import { schema } from '@kbn/config-schema';

export function defineRoutes(router: IRouter, core: CoreSetup) {
  router.post(
    {
      path: '/api/dashboard_generator/generate',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const [coreStart] = await core.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      const planned_dashboards = [];
      Object.entries(request.body).forEach(([file, obj]) => {
        // if a datastream has a semantic_annotations.yml file, we generate a dashboard for it
        if (file.startsWith('data_stream/') && file.endsWith('semantic_annotations.yml')) {
          const stream_manifest = `data_stream/${file.split('/')[1]}/manifest.yml`;
          const stream_manifest_obj = request.body[stream_manifest];
          planned_dashboards.push({ ...obj, ...stream_manifest_obj });
        }
      });
      for (const dashboard of planned_dashboards) {
        if (dashboard.type !== 'logs') {
          // only generate for logs
          continue;
        }
        let controlGroupInput = undefined;
        if (dashboard.resource_fields) {
          controlGroupInput = {
            controlStyle: 'oneLine',
            chainingSystem: 'HIERARCHICAL',
            showApplySelections: false,
            ignoreParentSettingsJSON:
              '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
            panelsJSON: JSON.stringify({
              '1': {
                order: 0,
                width: 'medium',
                grow: true,
                type: 'optionsListControl',
                explicitInput: {
                  fieldName: dashboard.resource_fields[0],
                  title: dashboard.resource_fields[0],
                  singleSelect: true,
                  id: '1',
                  enhancements: {},
                },
              },
            }),
          };
        }
        const panels = [];
        let x = 0;
        let y = 0;
        dashboard.main_pivots.forEach((pivot, index) => {
          panels.push({
            version: '8.9.0',
            type: 'lens',
            gridData: {
              h: 12,
              i: index,
              w: 12,
              x,
              y,
            },
            panelIndex: index,
            embeddableConfig: {
              attributes: {
                references: [
                  {
                    id: 'logs-*',
                    name: 'indexpattern-datasource-layer-e52ce143-94b8-4b0d-996c-ff71ded2647d',
                    type: 'index-pattern',
                  },
                ],
                state: {
                  adHocDataViews: {},
                  datasourceStates: {
                    formBased: {
                      layers: {
                        'e52ce143-94b8-4b0d-996c-ff71ded2647d': {
                          columnOrder: [
                            '4bdd1170-9e37-477f-86f3-06a403a558a0',
                            '1bdd5139-0732-45d4-92c0-c075822ddd3c',
                          ],
                          columns: {
                            '1bdd5139-0732-45d4-92c0-c075822ddd3c': {
                              customLabel: false,
                              dataType: 'number',
                              isBucketed: false,
                              label: 'Count of records',
                              operationType: 'count',
                              params: { emptyAsNull: true },
                              scale: 'ratio',
                              sourceField: '___records___',
                            },
                            '4bdd1170-9e37-477f-86f3-06a403a558a0': {
                              dataType: 'string',
                              isBucketed: true,
                              label: `Top 5 values of ${pivot}`,
                              operationType: 'terms',
                              params: {
                                missingBucket: false,
                                orderBy: {
                                  columnId: '1bdd5139-0732-45d4-92c0-c075822ddd3c',
                                  type: 'column',
                                },
                                orderDirection: 'desc',
                                otherBucket: false,
                                parentFormat: { id: 'terms' },
                                size: 5,
                              },
                              scale: 'ordinal',
                              sourceField: pivot,
                            },
                          },
                          incompleteColumns: {},
                        },
                      },
                    },
                  },
                  filters: [],
                  internalReferences: [],
                  query: { language: 'kuery', query: '' },
                  visualization: {
                    layers: [
                      {
                        categoryDisplay: 'default',
                        layerId: 'e52ce143-94b8-4b0d-996c-ff71ded2647d',
                        layerType: 'data',
                        legendDisplay: 'show',
                        legendPosition: 'right',
                        nestedLegend: false,
                        numberDisplay: 'percent',
                        primaryGroups: [
                          '4bdd1170-9e37-477f-86f3-06a403a558a0',
                        ],
                        metrics: ['1bdd5139-0732-45d4-92c0-c075822ddd3c'],
                      },
                    ],
                    palette: { name: 'kibana_palette', type: 'palette' },
                    shape: 'donut',
                  },
                },
                title: '',
                type: 'lens',
                visualizationType: 'lnsPie',
              },
              enhancements: {},
              type: 'lens',
            },
            title: `${pivot} breakdown`,
          });
          // alternate x and y to create a grid
          if (x === 0) {
            x = 12;
          } else {
            x = 0;
            y += 12;
          }
        });
        await soClient.create(
          'dashboard',
          {
            controlGroupInput,
            description: 'Generated Dashboard',
            hits: 0,
            kibanaSavedObjectMeta: {
              searchSourceJSON:
                '{"filter":[],"highlightAll":true,"query":{"language":"kuery","query":""},"version":true}',
            },
            optionsJSON:
              '{"darkTheme":false,"hidePanelTitles":false,"syncColors":false,"useMargins":true}',
            panelsJSON: JSON.stringify(panels),
            timeRestore: false,
            title: `Generated dashboard for ${dashboard.title}`,
            version: 1,
          },
          {
            references: [
              ...dashboard.main_pivots.map((pivot, index) => ({
                id: 'logs-*',
                name: `${index}:indexpattern-datasource-layer-e52ce143-94b8-4b0d-996c-ff71ded2647d`,
                type: 'index-pattern',
              })),
              {
                id: 'logs-*',
                name: 'controlGroup_1:optionsListDataView',
                type: 'index-pattern',
              },
            ],
          }
        );
      }
      console.log(request.body);
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );
}
