/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { VisualizeEmbeddableFactory, VisualizeInput } from '.';
import { VisualizeEmbeddableFactoryDeps } from './visualize_embeddable_factory';

describe('visualize_embeddable_factory', () => {
  const factory = new VisualizeEmbeddableFactory({} as VisualizeEmbeddableFactoryDeps);
  test('extract saved search references for search source state and not store them in state', () => {
    const { state, references } = factory.extract({
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
      },
      enhancements: {},
      type: 'visualization',
    } as unknown as EmbeddableStateWithType);
    expect(references).toEqual([
      {
        type: 'search',
        name: 'search_0',
        id: '123',
      },
    ]);
    expect((state as unknown as VisualizeInput).savedVis?.data.savedSearchId).toBeUndefined();
  });

  test('extract data view references for search source state and not store them in state', () => {
    const { state, references } = factory.extract({
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
      },
      enhancements: {},
      type: 'visualization',
    } as unknown as EmbeddableStateWithType);
    expect(references).toEqual([
      {
        type: 'index-pattern',
        name: (
          (state as unknown as VisualizeInput).savedVis?.data.searchSource as {
            indexRefName: string;
          }
        ).indexRefName,
        id: '123',
      },
    ]);
    expect((state as unknown as VisualizeInput).savedVis?.data.searchSource.index).toBeUndefined();
  });

  test('inject data view references into search source state', () => {
    const embeddedState = factory.inject(
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
        },
        enhancements: {},
        type: 'visualization',
      } as unknown as EmbeddableStateWithType,
      [{ name: 'x', id: '123', type: 'index-pattern' }]
    ) as VisualizeInput;
    expect(embeddedState.savedVis!.data.searchSource.index).toBe('123');
    expect(
      (embeddedState.savedVis!.data.searchSource as { indexRefName: string }).indexRefName
    ).toBe(undefined);
  });

  test('inject data view reference into search source state even if it is in injected state already', () => {
    const embeddedState = factory.inject(
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
        },
        enhancements: {},
        type: 'visualization',
      } as unknown as EmbeddableStateWithType,
      [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', id: '123', type: 'index-pattern' }]
    ) as VisualizeInput;
    expect(embeddedState.savedVis!.data.searchSource.index).toBe('123');
    expect(
      (embeddedState.savedVis!.data.searchSource as { indexRefName: string }).indexRefName
    ).toBe(undefined);
  });

  test('inject search reference into search source state', () => {
    const embeddedState = factory.inject(
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
        },
        enhancements: {},
        type: 'visualization',
      } as unknown as EmbeddableStateWithType,
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect((embeddedState as VisualizeInput).savedVis!.data.savedSearchId).toBe('123');
  });

  test('inject search reference into search source state even if it is injected already', () => {
    const embeddedState = factory.inject(
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
        },
        enhancements: {},
        type: 'visualization',
      } as unknown as EmbeddableStateWithType,
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect((embeddedState as VisualizeInput).savedVis!.data.savedSearchId).toBe('123');
  });
});
