/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch } from '@kbn/discover-plugin/public';
import type { VisualizeInput, VisSavedObject, Vis, VisParams } from '../..';
import {
  getVisualizationInstance,
  getVisualizationInstanceFromInput,
} from './get_visualization_instance';
import { createVisualizeServicesMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import type { VisualizeServices } from '../types';

const commonSerializedVisMock = {
  type: 'area',
  aggs: [],
};

jest.mock('../../utils/saved_visualize_utils', () => {
  const actual = jest.requireActual('../../utils/saved_visualize_utils');
  return {
    ...actual,
    getSavedVisualization: jest.fn(),
    convertToSerializedVis: jest.fn().mockReturnValue(commonSerializedVisMock),
  };
});
const { getSavedVisualization, convertToSerializedVis } = jest.requireMock(
  '../../utils/saved_visualize_utils'
);

jest.mock('../../vis_async', () => ({
  createVisAsync: jest.fn(),
}));
const { createVisAsync } = jest.requireMock('../../vis_async');

jest.mock('@kbn/discover-plugin/public', () => ({
  getSavedSearch: jest.fn().mockResolvedValue({
    id: 'savedSearch',
    title: 'savedSearchTitle',
    searchSource: {},
  }),
  throwErrorOnSavedSearchUrlConflict: jest.fn(),
}));

let savedVisMock: VisSavedObject;

describe('getVisualizationInstance', () => {
  let visMock: Vis<VisParams>;
  let mockServices: jest.Mocked<VisualizeServices>;
  let subj: BehaviorSubject<any>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
    subj = new BehaviorSubject({});
    visMock = {
      type: {},
      data: {},
    } as Vis<VisParams>;
    savedVisMock = {} as VisSavedObject;

    getSavedVisualization.mockImplementation((opts: unknown) => savedVisMock);
    createVisAsync.mockImplementation(() => visMock);
    mockServices.data.search.showError = jest.fn().mockImplementation(() => {});
    mockServices.createVisEmbeddableFromObject = jest.fn().mockImplementation(() => ({
      getOutput$: jest.fn(() => subj.asObservable()),
    }));
  });

  test('should create new instances of savedVis, vis and embeddableHandler', async () => {
    const opts = {
      type: 'area',
      indexPattern: 'my_index_pattern',
    };
    const { savedVis, savedSearch, vis, embeddableHandler } = await getVisualizationInstance(
      mockServices,
      opts
    );

    expect(getSavedVisualization.mock.calls[0][1]).toBe(opts);
    expect(savedVisMock.searchSourceFields).toEqual({
      index: opts.indexPattern,
    });
    expect(convertToSerializedVis).toHaveBeenCalledWith(savedVisMock);
    expect(createVisAsync).toHaveBeenCalledWith(
      commonSerializedVisMock.type,
      commonSerializedVisMock
    );
    expect(mockServices.createVisEmbeddableFromObject).toHaveBeenCalledWith(visMock, {
      searchSessionId: undefined,
      timeRange: undefined,
      filters: undefined,
      renderMode: 'edit',
      id: '',
    });

    expect(vis).toBe(visMock);
    expect(savedVis).toBe(savedVisMock);
    expect(embeddableHandler).toBeDefined();
    expect(savedSearch).toBeUndefined();
  });

  test('should load existing vis by id and call vis type setup if exists', async () => {
    const newVisObj = { data: {} };
    // @ts-expect-error
    visMock.type.setup = jest.fn(() => newVisObj);
    const { vis } = await getVisualizationInstance(mockServices, 'saved_vis_id');

    expect(getSavedVisualization.mock.calls[1][1]).toBe('saved_vis_id');
    expect(savedVisMock.searchSourceFields).toBeUndefined();
    expect(visMock.type.setup).toHaveBeenCalledWith(visMock);
    expect(vis).toBe(newVisObj);
  });

  test('should create saved search instance if vis based on saved search id', async () => {
    visMock.data.savedSearchId = 'saved_search_id';
    const { savedSearch } = await getVisualizationInstance(mockServices, 'saved_vis_id');

    expect(getSavedSearch).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "id": "savedSearch",
        "searchSource": Object {},
        "title": "savedSearchTitle",
      }
    `);
  });

  test('should subscribe on embeddable handler updates and send toasts on errors', async () => {
    await getVisualizationInstance(mockServices, 'saved_vis_id');

    subj.next({
      error: 'error',
    });

    expect(mockServices.data.search.showError).toHaveBeenCalled();
  });
});

describe('getVisualizationInstanceInput', () => {
  const serializedVisMock = {
    type: 'pie',
  };
  let visMock: Vis<VisParams>;
  let mockServices: jest.Mocked<VisualizeServices>;
  let subj: BehaviorSubject<any>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
    subj = new BehaviorSubject({});
    visMock = {
      type: {},
      data: {},
    } as Vis<VisParams>;
    savedVisMock = {} as VisSavedObject;

    createVisAsync.mockImplementation(() => visMock);
    getSavedVisualization.mockImplementation((opts: unknown) => savedVisMock);
    mockServices.createVisEmbeddableFromObject = jest.fn().mockImplementation(() => ({
      getOutput$: jest.fn(() => subj.asObservable()),
    }));
  });

  test('should create new instances of savedVis, vis and embeddableHandler', async () => {
    const input = {
      id: 'test-id',
      savedVis: {
        title: '',
        description: '',
        type: 'pie',
        params: {
          type: 'pie',
          addTooltip: true,
          addLegend: true,
          legendPosition: 'right',
          isDonut: true,
          labels: {
            show: false,
            values: true,
            last_level: true,
            truncate: 100,
          },
        },
        uiState: {
          vis: {
            colors: {
              Count: '#1F78C1',
            },
          },
        },
      },
    } as unknown as VisualizeInput;
    const { savedVis, savedSearch, vis, embeddableHandler } =
      await getVisualizationInstanceFromInput(mockServices, input);

    expect(getSavedVisualization).toHaveBeenCalled();
    expect(createVisAsync).toHaveBeenCalledWith(serializedVisMock.type, input.savedVis);
    expect(mockServices.createVisEmbeddableFromObject).toHaveBeenCalledWith(visMock, {
      searchSessionId: undefined,
      timeRange: undefined,
      filters: undefined,
      renderMode: 'edit',
      id: '',
    });

    expect(vis).toBe(visMock);
    expect(savedVis).toBe(savedVisMock);
    expect(savedVis.uiStateJSON).toBe(JSON.stringify(input.savedVis?.uiState));
    expect(embeddableHandler).toBeDefined();
    expect(savedSearch).toBeUndefined();
  });
});
