/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getEventAnnotationService } from './service';
import { EventAnnotationServiceType } from './types';

describe('Event Annotation Service', () => {
  let eventAnnotationService: EventAnnotationServiceType;
  beforeAll(() => {
    eventAnnotationService = getEventAnnotationService();
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
});
