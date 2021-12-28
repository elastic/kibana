/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch } from '../../../../discover/public';
import { Vis } from '../../vis';
import { VisualizeInput } from 'src/plugins/visualizations/public';
import {
  getVisualizationInstance,
  getVisualizationInstanceFromInput,
} from './get_visualization_instance';
import { createVisualizeServicesMock } from './mocks';
import { BehaviorSubject } from 'rxjs';
import { SearchSource as mockSearchSource } from '../../../../data/common/search/search_source';
import { stubIndexPattern as mockStubIndexPattern } from '../../../../data/common/stubs';
import { setTypes, setAggs, setSearch } from '../../services';
import type { VisualizeServices } from '../types';
import type { TypesStart } from '../../vis_types';
import type { AggsStart } from '../../../../data/common';
import type { ISearchStart } from '../../../../data/public';

jest.mock('../../../../discover/public', () => ({
  getSavedSearch: jest.fn().mockResolvedValue({
    id: 'savedSearch',
    title: 'savedSearchTitle',
    searchSource: {},
  }),
  throwErrorOnSavedSearchUrlConflict: jest.fn(),
}));

jest.mock('../../../../data/public', () => ({
  injectSearchSourceReferences: jest.fn((...args) => jest.fn(...args)),
  parseSearchSourceJSON: jest.fn((...args) => jest.fn(...args)),
}));

describe('getVisualizationInstance', () => {
  let mockServices: jest.Mocked<VisualizeServices>;
  let subj: BehaviorSubject<any>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
    subj = new BehaviorSubject({});

    setTypes({ get: jest.fn(() => ({ schemas: { all: [] } })) } as unknown as TypesStart);
    setAggs({
      createAggConfigs: (indexPattern: any, cfg: any) => ({
        aggs: cfg.map((aggConfig: any) => ({ ...aggConfig, toJSON: () => aggConfig })),
      }),
    } as unknown as AggsStart);
    setSearch({
      searchSource: {
        // @ts-expect-error
        create: () => new mockSearchSource({ index: mockStubIndexPattern }),
      },
    } as unknown as ISearchStart);

    // @ts-expect-error
    mockServices.data.search.showError.mockImplementation(() => {});
    mockServices.savedObjects.client.resolve = jest.fn().mockResolvedValue({
      saved_object: {
        references: [
          {
            id: 'saved_vis_id',
            type: 'index-pattern',
          },
        ],
        attributes: {
          visState: JSON.stringify({ type: 'area' }),
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{filter: []}',
          },
        },
        _version: '1',
      },
      outcome: 'exact',
      alias_target_id: null,
    });
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

    expect(vis).toBeInstanceOf(Vis);
    expect(savedVis).toMatchSnapshot();
    expect(embeddableHandler).toBeDefined();
    expect(savedSearch).toBeUndefined();
  });

  test('should load existing vis by id and call vis type setup if exists', async () => {
    const newVisObj = { data: {} };
    const setupMock = jest.fn(() => newVisObj);
    setTypes({
      get: jest.fn(() => ({ setup: setupMock, schemas: { all: [] } })),
    } as unknown as TypesStart);
    const { vis } = await getVisualizationInstance(mockServices, 'saved_vis_id');

    expect(vis.type.setup).toHaveBeenCalled();
    expect(vis).toBe(newVisObj);
  });

  test('should create saved search instance if vis based on saved search id', async () => {
    const { savedSearch } = await getVisualizationInstance(mockServices, 'saved_vis_id');

    expect(getSavedSearch).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`undefined`);
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
  let mockServices: jest.Mocked<VisualizeServices>;
  let subj: BehaviorSubject<any>;

  beforeEach(() => {
    subj = new BehaviorSubject({});
    mockServices = createVisualizeServicesMock();
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

    expect(vis).toMatchSnapshot();
    expect(savedVis).toMatchSnapshot();
    expect(savedVis.uiStateJSON).toBe(JSON.stringify(input.savedVis?.uiState));
    expect(embeddableHandler).toBeDefined();
    expect(savedSearch).toBeUndefined();
  });
});
