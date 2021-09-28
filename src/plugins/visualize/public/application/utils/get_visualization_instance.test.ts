/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSavedSearchesLoader } from '../../../../discover/public';
import type {
  VisualizeInput,
  VisSavedObject,
  Vis,
  VisParams,
} from 'src/plugins/visualizations/public';
import {
  getVisualizationInstance,
  getVisualizationInstanceFromInput,
} from './get_visualization_instance';
import { createVisualizeServicesMock } from './mocks';
import { VisualizeServices } from '../types';
import { BehaviorSubject } from 'rxjs';

const mockSavedSearchObj = {};
const mockGetSavedSearch = jest.fn(() => mockSavedSearchObj);

jest.mock('../../../../discover/public', () => ({
  createSavedSearchesLoader: jest.fn(() => ({
    get: mockGetSavedSearch,
  })),
}));

describe('getVisualizationInstance', () => {
  const serializedVisMock = {
    type: 'area',
  };
  let savedVisMock: VisSavedObject;
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
    // @ts-expect-error
    mockServices.data.search.showError.mockImplementation(() => {});
    // @ts-expect-error
    mockServices.savedVisualizations.get.mockImplementation(() => savedVisMock);
    // @ts-expect-error
    mockServices.visualizations.convertToSerializedVis.mockImplementation(() => serializedVisMock);
    // @ts-expect-error
    mockServices.visualizations.createVis.mockImplementation(() => visMock);
    // @ts-expect-error
    mockServices.createVisEmbeddableFromObject.mockImplementation(() => ({
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

    expect(mockServices.savedVisualizations.get).toHaveBeenCalledWith(opts);
    expect(savedVisMock.searchSourceFields).toEqual({
      index: opts.indexPattern,
    });
    expect(mockServices.visualizations.convertToSerializedVis).toHaveBeenCalledWith(savedVisMock);
    expect(mockServices.visualizations.createVis).toHaveBeenCalledWith(
      serializedVisMock.type,
      serializedVisMock
    );
    expect(mockServices.createVisEmbeddableFromObject).toHaveBeenCalledWith(visMock, {
      timeRange: undefined,
      filters: undefined,
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

    expect(mockServices.savedVisualizations.get).toHaveBeenCalledWith('saved_vis_id');
    expect(savedVisMock.searchSourceFields).toBeUndefined();
    expect(visMock.type.setup).toHaveBeenCalledWith(visMock);
    expect(vis).toBe(newVisObj);
  });

  test('should create saved search instance if vis based on saved search id', async () => {
    visMock.data.savedSearchId = 'saved_search_id';
    const { savedSearch } = await getVisualizationInstance(mockServices, 'saved_vis_id');

    expect(createSavedSearchesLoader).toHaveBeenCalled();
    expect(mockGetSavedSearch).toHaveBeenCalledWith(visMock.data.savedSearchId);
    expect(savedSearch).toBe(mockSavedSearchObj);
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
  let savedVisMock: VisSavedObject;
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
    // @ts-expect-error
    mockServices.savedVisualizations.get.mockImplementation(() => savedVisMock);
    // @ts-expect-error
    mockServices.visualizations.createVis.mockImplementation(() => visMock);
    // @ts-expect-error
    mockServices.createVisEmbeddableFromObject.mockImplementation(() => ({
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

    expect(mockServices.savedVisualizations.get).toHaveBeenCalled();
    expect(mockServices.visualizations.createVis).toHaveBeenCalledWith(
      serializedVisMock.type,
      input.savedVis
    );
    expect(mockServices.createVisEmbeddableFromObject).toHaveBeenCalledWith(visMock, {
      timeRange: undefined,
      filters: undefined,
      id: '',
    });

    expect(vis).toBe(visMock);
    expect(savedVis).toBe(savedVisMock);
    expect(savedVis.uiStateJSON).toBe(JSON.stringify(input.savedVis?.uiState));
    expect(embeddableHandler).toBeDefined();
    expect(savedSearch).toBeUndefined();
  });
});
