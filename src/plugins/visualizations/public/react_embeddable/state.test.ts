/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { serializeState, deserializeState } from './state';
import { VisualizeSerializedState } from './types';

describe('visualize_embeddable', () => {
  test('extracts saved search references for search source state and does not store them in state', () => {
    const { rawState, references } = serializeState({
      savedVis: {
        type: 'area',
        params: {},
        uiState: {},
        data: {
          aggs: [
            {
              id: '1',
              enabled: true,
              type: 'count',
              params: {},
              schema: 'metric',
            },
          ],
          searchSource: {
            query: {
              query: '',
              language: 'kuery',
            },
            filter: [],
          },
          savedSearchId: '123',
        },
        title: 'owo',
      },
      id: 'uwu',
      titles: {},
    });
    expect(references).toEqual([
      {
        type: 'search',
        name: 'search_0',
        id: '123',
      },
    ]);
    expect('savedSearchId' in rawState.savedVis.data).toBeFalsy();
  });

  test('extracts data view references for search source state and does not store them in state', () => {
    const { rawState, references } = serializeState({
      savedVis: {
        type: 'area',
        params: {},
        uiState: {},
        data: {
          aggs: [
            {
              id: '1',
              enabled: true,
              type: 'count',
              params: {},
              schema: 'metric',
            },
          ],
          searchSource: {
            query: {
              query: '',
              language: 'kuery',
            },
            index: '123',
            filter: [],
          },
        },
        title: 'owo',
      },
      id: 'uwu',
      titles: {},
    });
    expect(references).toEqual([
      {
        type: 'index-pattern',
        name: (
          rawState.savedVis.data.searchSource as {
            indexRefName: string;
          }
        ).indexRefName,
        id: '123',
      },
    ]);
    expect(rawState.savedVis.data.searchSource.index).toBeUndefined();
  });

  test('injects data view references into search source state', () => {
    const embeddedState = deserializeState({
      rawState: {
        savedVis: {
          type: 'area',
          params: {},
          uiState: {},
          data: {
            aggs: [
              {
                id: '1',
                enabled: true,
                type: 'count',
                params: {},
                schema: 'metric',
              },
            ],
            searchSource: {
              query: {
                query: '',
                language: 'kuery',
              },
              indexRefName: 'x',
              filter: [],
            },
          },
          title: 'owo',
        },
        id: 'uwu',
      },
      references: [{ name: 'x', id: '123', type: 'index-pattern' }],
    }) as VisualizeSerializedState;
    expect(embeddedState.savedVis.data.searchSource.index).toBe('123');
    expect(
      (embeddedState.savedVis.data.searchSource as { indexRefName: string }).indexRefName
    ).toBe(undefined);
  });

  test('injects data view reference into search source state even if it is injected already', () => {
    const embeddedState = deserializeState({
      rawState: {
        savedVis: {
          type: 'area',
          params: {},
          uiState: {},
          data: {
            aggs: [
              {
                id: '1',
                enabled: true,
                type: 'count',
                params: {},
                schema: 'metric',
              },
            ],
            searchSource: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: '456',
              filter: [],
            },
          },
          title: 'owo',
        },
        id: 'uwu',
      },
      references: [
        { name: 'kibanaSavedObjectMeta.searchSourceJSON.index', id: '123', type: 'index-pattern' },
      ],
    }) as VisualizeSerializedState;
    expect(embeddedState.savedVis.data.searchSource.index).toBe('123');
    expect(embeddedState.savedVis.data.searchSource.indexRefName).toBe(undefined);
  });

  test('injects search reference into search source state', () => {
    const embeddedState = deserializeState({
      rawState: {
        savedVis: {
          type: 'area',
          params: {},
          uiState: {},
          data: {
            aggs: [
              {
                id: '1',
                enabled: true,
                type: 'count',
                params: {},
                schema: 'metric',
              },
            ],
            searchSource: {
              query: {
                query: '',
                language: 'kuery',
              },
              filter: [],
            },
          },
          title: 'owo',
        },
        id: 'uwu',
      },
      references: [{ name: 'search_0', id: '123', type: 'search' }],
    }) as VisualizeSerializedState;
    expect(embeddedState.savedVis.data.savedSearchId).toBe('123');
  });

  test('injects search reference into search source state even if it is injected already', () => {
    const embeddedState = deserializeState({
      rawState: {
        savedVis: {
          type: 'area',
          params: {},
          uiState: {},
          data: {
            aggs: [
              {
                id: '1',
                enabled: true,
                type: 'count',
                params: {},
                schema: 'metric',
              },
            ],
            searchSource: {
              query: {
                query: '',
                language: 'kuery',
              },
              filter: [],
            },
            savedSearchId: '789',
          },
          title: 'owo',
        },
        id: 'uwu',
      },
      references: [{ name: 'search_0', id: '123', type: 'search' }],
    }) as VisualizeSerializedState;
    expect(embeddedState.savedVis.data.savedSearchId).toBe('123');
  });
});
