/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { serializeState, deserializeSavedVisState } from './state';
import { VisualizeSavedVisInputState } from './types';

describe('visualize_embeddable state', () => {
  test('extracts saved search references for search source state and does not store them in state', () => {
    const { rawState, references } = serializeState({
      serializedVis: {
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
      titles: {},
    }) as SerializedPanelState<VisualizeSavedVisInputState>;
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
      serializedVis: {
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
      titles: {},
    }) as SerializedPanelState<VisualizeSavedVisInputState>;
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

  test('injects data view references into search source state', async () => {
    const deserializedSavedVis = await deserializeSavedVisState(
      {
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
      },
      [{ name: 'x', id: '123', type: 'index-pattern' }]
    );
    expect(deserializedSavedVis.data.searchSource.index).toBe('123');
    expect((deserializedSavedVis.data.searchSource as { indexRefName: string }).indexRefName).toBe(
      undefined
    );
  });

  test('injects data view reference into search source state even if it is injected already', async () => {
    const deserializedSavedVis = await deserializeSavedVisState(
      {
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
      },
      [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', id: '123', type: 'index-pattern' }]
    );
    expect(deserializedSavedVis.data.searchSource?.index).toBe('123');
    expect(deserializedSavedVis.data.searchSource?.indexRefName).toBe(undefined);
  });

  test('injects search reference into search source state', async () => {
    const deserializedSavedVis = await deserializeSavedVisState(
      {
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
      },
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(deserializedSavedVis.data.savedSearchId).toBe('123');
  });

  test('injects search reference into search source state even if it is injected already', async () => {
    const deserializedSavedVis = await deserializeSavedVisState(
      {
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
      },
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(deserializedSavedVis.data.savedSearchId).toBe('123');
  });
});
