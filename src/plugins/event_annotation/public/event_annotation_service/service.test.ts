/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-browser';
import { CoreStart, SimpleSavedObject } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { EventAnnotationConfig, EventAnnotationGroupAttributes } from '../../common';
import { getEventAnnotationService } from './service';
import { EventAnnotationServiceType } from './types';

type AnnotationGroupSavedObject = SimpleSavedObject<EventAnnotationGroupAttributes>;

const annotationGroupResolveMocks: Record<string, AnnotationGroupSavedObject> = {
  nonExistingGroup: {
    attributes: {} as EventAnnotationGroupAttributes,
    references: [],
    id: 'nonExistingGroup',
    error: {
      error: 'Saved object not found',
      statusCode: 404,
      message: 'Not found',
    },
  } as Partial<AnnotationGroupSavedObject> as AnnotationGroupSavedObject,
  noAnnotations: {
    attributes: {
      title: 'groupTitle',
      description: '',
      tags: [],
      ignoreGlobalFilters: false,
      annotations: [],
    },
    type: 'event-annotation-group',
    references: [
      {
        id: 'ipid',
        name: 'ipid',
        type: 'index-pattern',
      },
      {
        id: 'some-tag',
        name: 'some-tag',
        type: 'tag',
      },
    ],
  } as Partial<AnnotationGroupSavedObject> as AnnotationGroupSavedObject,
  multiAnnotations: {
    attributes: {
      title: 'groupTitle',
    },
    id: 'multiAnnotations',
    type: 'event-annotation-group',
    references: [
      {
        id: 'ipid',
        name: 'ipid',
        type: 'index-pattern',
      },
    ],
  } as Partial<AnnotationGroupSavedObject> as AnnotationGroupSavedObject,
  withAdHocDataView: {
    attributes: {
      title: 'groupTitle',
      dataViewSpec: {
        id: 'my-id',
      },
    } as Partial<EventAnnotationGroupAttributes>,
    id: 'multiAnnotations',
    type: 'event-annotation-group',
    references: [],
  } as Partial<AnnotationGroupSavedObject> as AnnotationGroupSavedObject,
};

const annotationResolveMocks = {
  nonExistingGroup: { savedObjects: [] },
  noAnnotations: { savedObjects: [] },
  multiAnnotations: {
    savedObjects: [
      {
        id: 'annotation1',
        attributes: {
          id: 'annotation1',
          type: 'manual',
          key: { type: 'point_in_time' as const, timestamp: '2022-03-18T08:25:00.000Z' },
          label: 'Event',
          icon: 'triangle' as const,
          color: 'red',
          lineStyle: 'dashed' as const,
          lineWidth: 3,
        } as EventAnnotationConfig,
        type: 'event-annotation',
        references: [
          {
            id: 'multiAnnotations',
            name: 'event_annotation_group_ref',
            type: 'event-annotation-group',
          },
        ],
      },
      {
        id: 'annotation2',
        attributes: {
          id: 'ann2',
          label: 'Query based event',
          icon: 'triangle',
          color: 'red',
          type: 'query',
          timeField: 'timestamp',
          key: {
            type: 'point_in_time',
          },
          lineStyle: 'dashed',
          lineWidth: 3,
          filter: { type: 'kibana_query', query: '', language: 'kuery' },
        } as EventAnnotationConfig,
        type: 'event-annotation',
        references: [
          {
            id: 'multiAnnotations',
            name: 'event_annotation_group_ref',
            type: 'event-annotation-group',
          },
        ],
      },
    ],
  },
};

let core: CoreStart;

describe('Event Annotation Service', () => {
  let eventAnnotationService: EventAnnotationServiceType;
  beforeEach(() => {
    core = coreMock.createStart();
    (core.savedObjects.client.create as jest.Mock).mockImplementation(() => {
      return annotationGroupResolveMocks.multiAnnotations;
    });
    (core.savedObjects.client.get as jest.Mock).mockImplementation((_type, id) => {
      const typedId = id as keyof typeof annotationGroupResolveMocks;
      return annotationGroupResolveMocks[typedId];
    });
    (core.savedObjects.client.find as jest.Mock).mockResolvedValue({
      total: 10,
      savedObjects: Object.values(annotationGroupResolveMocks),
    } as Pick<SavedObjectsFindResponse<EventAnnotationGroupAttributes>, 'total' | 'savedObjects'>);
    (core.savedObjects.client.bulkCreate as jest.Mock).mockImplementation(() => {
      return annotationResolveMocks.multiAnnotations;
    });
    eventAnnotationService = getEventAnnotationService(
      core,
      {} as SavedObjectsManagementPluginStart
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toExpression', () => {
    it('should work for an empty list', () => {
      expect(eventAnnotationService.toExpression([])).toEqual([]);
    });

    it('should process manual point annotations', () => {
      expect(
        eventAnnotationService.toExpression([
          {
            id: 'myEvent',
            type: 'manual',
            key: {
              type: 'point_in_time',
              timestamp: '2022',
            },
            label: 'Hello',
          },
        ])
      ).toEqual([
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_point_event_annotation',
              arguments: {
                id: ['myEvent'],
                isHidden: [false],
                time: ['2022'],
                label: ['Hello'],
                color: ['#f04e98'],
                lineWidth: [1],
                lineStyle: ['solid'],
                icon: ['triangle'],
                textVisibility: [false],
              },
            },
          ],
        },
      ]);
    });
    it('should process manual range annotations', () => {
      expect(
        eventAnnotationService.toExpression([
          {
            id: 'myEvent',
            type: 'manual',
            key: {
              type: 'range',
              timestamp: '2021',
              endTimestamp: '2022',
            },
            label: 'Hello',
          },
        ])
      ).toEqual([
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_range_event_annotation',
              arguments: {
                id: ['myEvent'],
                isHidden: [false],
                time: ['2021'],
                endTime: ['2022'],
                label: ['Hello'],
                color: ['#F04E981A'],
                outside: [false],
              },
            },
          ],
        },
      ]);
    });
    it('should process query based annotations', () => {
      expect(
        eventAnnotationService.toExpression([
          {
            id: 'myEvent',
            type: 'query',
            timeField: '@timestamp',
            key: {
              type: 'point_in_time',
            },
            label: 'Hello',
            filter: { type: 'kibana_query', query: '', language: 'kuery' },
          },
        ])
      ).toEqual([
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'query_point_event_annotation',
              arguments: {
                id: ['myEvent'],
                isHidden: [false],
                timeField: ['@timestamp'],
                label: ['Hello'],
                color: ['#f04e98'],
                lineWidth: [1],
                lineStyle: ['solid'],
                icon: ['triangle'],
                textVisibility: [false],
                textField: [],
                filter: [
                  {
                    chain: [
                      {
                        arguments: {
                          q: [''],
                        },
                        function: 'kql',
                        type: 'function',
                      },
                    ],
                    type: 'expression',
                  },
                ],
                extraFields: [],
              },
            },
          ],
        },
      ]);
    });
    it('should process mixed annotations', () => {
      expect(
        eventAnnotationService.toExpression([
          {
            id: 'myEvent',
            type: 'manual',
            key: {
              type: 'point_in_time',
              timestamp: '2022',
            },
            label: 'Hello',
          },
          {
            id: 'myRangeEvent',
            type: 'manual',
            key: {
              type: 'range',
              timestamp: '2021',
              endTimestamp: '2022',
            },
            label: 'Hello Range',
          },
          {
            id: 'myEvent',
            type: 'query',
            timeField: '@timestamp',
            key: {
              type: 'point_in_time',
            },
            label: 'Hello',
            filter: { type: 'kibana_query', query: '', language: 'kuery' },
          },
        ])
      ).toEqual([
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_point_event_annotation',
              arguments: {
                id: ['myEvent'],
                isHidden: [false],
                time: ['2022'],
                label: ['Hello'],
                color: ['#f04e98'],
                lineWidth: [1],
                lineStyle: ['solid'],
                icon: ['triangle'],
                textVisibility: [false],
              },
            },
          ],
        },
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_range_event_annotation',
              arguments: {
                id: ['myRangeEvent'],
                isHidden: [false],
                time: ['2021'],
                endTime: ['2022'],
                label: ['Hello Range'],
                color: ['#F04E981A'],
                outside: [false],
              },
            },
          ],
        },
        {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'query_point_event_annotation',
              arguments: {
                id: ['myEvent'],
                isHidden: [false],
                timeField: ['@timestamp'],
                label: ['Hello'],
                color: ['#f04e98'],
                lineWidth: [1],
                lineStyle: ['solid'],
                icon: ['triangle'],
                textVisibility: [false],
                textField: [],
                filter: [
                  {
                    chain: [
                      {
                        arguments: {
                          q: [''],
                        },
                        function: 'kql',
                        type: 'function',
                      },
                    ],
                    type: 'expression',
                  },
                ],
                extraFields: [],
              },
            },
          ],
        },
      ]);
    });
    it.each`
      textVisibility | textField    | expected
      ${'true'}      | ${''}        | ${''}
      ${'false'}     | ${''}        | ${''}
      ${'true'}      | ${'myField'} | ${'myField'}
      ${'false'}     | ${''}        | ${''}
    `(
      "should handle correctly textVisibility when set to '$textVisibility' and textField to '$textField'",
      ({ textVisibility, textField, expected }) => {
        expect(
          eventAnnotationService.toExpression([
            {
              id: 'myEvent',
              type: 'query',
              timeField: '@timestamp',
              key: {
                type: 'point_in_time',
              },
              label: 'Hello',
              filter: { type: 'kibana_query', query: '', language: 'kuery' },
              textVisibility,
              textField,
            },
          ])
        ).toEqual([
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'query_point_event_annotation',
                arguments: {
                  id: ['myEvent'],
                  isHidden: [false],
                  timeField: ['@timestamp'],
                  label: ['Hello'],
                  color: ['#f04e98'],
                  lineWidth: [1],
                  lineStyle: ['solid'],
                  icon: ['triangle'],
                  textVisibility: [textVisibility],
                  textField: expected ? [expected] : [],
                  filter: [
                    {
                      chain: [
                        {
                          arguments: {
                            q: [''],
                          },
                          function: 'kql',
                          type: 'function',
                        },
                      ],
                      type: 'expression',
                    },
                  ],
                  extraFields: [],
                },
              },
            ],
          },
        ]);
      }
    );
  });
  describe('loadAnnotationGroup', () => {
    it('should throw error when loading group doesnt exist', async () => {
      expect(() => eventAnnotationService.loadAnnotationGroup('nonExistingGroup')).rejects
        .toMatchInlineSnapshot(`
        Object {
          "error": "Saved object not found",
          "message": "Not found",
          "statusCode": 404,
        }
      `);
    });
    it('should properly load an annotation group with no annotation', async () => {
      expect(await eventAnnotationService.loadAnnotationGroup('noAnnotations'))
        .toMatchInlineSnapshot(`
        Object {
          "annotations": Array [],
          "dataViewSpec": undefined,
          "description": "",
          "ignoreGlobalFilters": false,
          "indexPatternId": "ipid",
          "tags": Array [
            "some-tag",
          ],
          "title": "groupTitle",
        }
      `);
    });
    it('should properly load an annotation group with a multiple annotation', async () => {
      expect(
        await eventAnnotationService.loadAnnotationGroup('multiAnnotations')
      ).toMatchSnapshot();
    });
    it('populates id if group has ad-hoc data view', async () => {
      const group = await eventAnnotationService.loadAnnotationGroup('withAdHocDataView');

      expect(group.indexPatternId).toBe(group.dataViewSpec?.id);
    });
  });
  describe('findAnnotationGroupContent', () => {
    it('should retrieve saved objects and format them', async () => {
      const searchTerm = 'my search';

      const content = await eventAnnotationService.findAnnotationGroupContent(searchTerm, 20, [
        { type: 'mytype', id: '1234' },
      ]);

      expect(content).toMatchSnapshot();

      expect((core.savedObjects.client.find as jest.Mock).mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "defaultSearchOperator": "AND",
              "hasNoReference": undefined,
              "hasReference": Array [
                Object {
                  "id": "1234",
                  "type": "mytype",
                },
              ],
              "page": 1,
              "perPage": 20,
              "search": "my search*",
              "searchFields": Array [
                "title^3",
                "description",
              ],
              "type": Array [
                "event-annotation-group",
              ],
            },
          ],
        ]
      `);
    });
  });
  describe('deleteAnnotationGroups', () => {
    it('deletes annotation group along with annotations that reference them', async () => {
      await eventAnnotationService.deleteAnnotationGroups(['id1', 'id2']);
      expect(core.savedObjects.client.bulkDelete).toHaveBeenCalledWith([
        { id: 'id1', type: 'event-annotation-group' },
        { id: 'id2', type: 'event-annotation-group' },
      ]);
    });
  });
  describe('createAnnotationGroup', () => {
    it('creates annotation group along with annotations', async () => {
      const annotations = [
        annotationResolveMocks.multiAnnotations.savedObjects[0].attributes,
        annotationResolveMocks.multiAnnotations.savedObjects[1].attributes,
      ];
      await eventAnnotationService.createAnnotationGroup({
        title: 'newGroupTitle',
        description: 'my description',
        tags: ['tag1', 'tag2', 'tag3'],
        indexPatternId: 'ipid',
        ignoreGlobalFilters: false,
        annotations,
      });
      expect(core.savedObjects.client.create).toHaveBeenCalledWith(
        'event-annotation-group',
        {
          title: 'newGroupTitle',
          description: 'my description',
          ignoreGlobalFilters: false,
          dataViewSpec: null,
          annotations,
        },
        {
          references: [
            {
              id: 'ipid',
              name: 'event-annotation-group_dataView-ref-ipid',
              type: 'index-pattern',
            },
            {
              id: 'tag1',
              name: 'tag1',
              type: 'tag',
            },
            {
              id: 'tag2',
              name: 'tag2',
              type: 'tag',
            },
            {
              id: 'tag3',
              name: 'tag3',
              type: 'tag',
            },
          ],
        }
      );
    });
  });
  describe('updateAnnotationGroup', () => {
    it('updates annotation group attributes', async () => {
      await eventAnnotationService.updateAnnotationGroup(
        {
          title: 'newTitle',
          description: '',
          tags: [],
          indexPatternId: 'newId',
          annotations: [],
          ignoreGlobalFilters: false,
        },
        'multiAnnotations'
      );
      expect(core.savedObjects.client.update).toHaveBeenCalledWith(
        'event-annotation-group',
        'multiAnnotations',
        {
          title: 'newTitle',
          description: '',
          tags: [],
          annotations: [],
          dataViewSpec: null,
          ignoreGlobalFilters: false,
        },
        {
          references: [
            {
              id: 'newId',
              name: 'event-annotation-group_dataView-ref-newId',
              type: 'index-pattern',
            },
          ],
        }
      );
    });
  });
});
