/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
jest.mock('ui/new_platform');

import { searchSourceMock } from '../../courier/search_source/mocks';
import { mockDataLoaderFetch, timefilter } from './embedded_visualize_handler.test.mocks';

import _ from 'lodash';
// @ts-ignore
import MockState from '../../../../../fixtures/mock_state';
import { Vis } from '../../vis';
import { VisResponseData } from './types';
import { Inspector } from '../../inspector';
import { EmbeddedVisualizeHandler, RequestHandlerParams } from './embedded_visualize_handler';
import { AggConfigs } from 'ui/agg_types/agg_configs';

jest.mock('plugins/interpreter/interpreter', () => ({
  getInterpreter: () => {
    return Promise.resolve();
  },
}));

jest.mock('../../../../core_plugins/interpreter/public/registries', () => ({
  registries: {
    renderers: {
      get: (name: string) => {
        return {
          render: async () => {
            return {};
          },
        };
      },
    },
  },
}));

describe('EmbeddedVisualizeHandler', () => {
  let handler: any;
  let div: HTMLElement;
  let dataLoaderParams: RequestHandlerParams;
  const mockVis: Vis = {
    title: 'My Vis',
    // @ts-ignore
    type: 'foo',
    getAggConfig: () => [],
    _setUiState: () => ({}),
    getUiState: () => new MockState(),
    on: () => ({}),
    off: () => ({}),
    removeListener: jest.fn(),
    API: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(_, 'debounce').mockImplementation(
      // @ts-ignore
      (f: Function) => {
        // @ts-ignore
        f.cancel = () => {};
        return f;
      }
    );

    dataLoaderParams = {
      aggs: ([] as any) as AggConfigs,
      filters: undefined,
      forceFetch: false,
      inspectorAdapters: {},
      query: undefined,
      queryFilter: null,
      searchSource: searchSourceMock,
      timeRange: undefined,
      uiState: undefined,
    };

    div = document.createElement('div');
    handler = new EmbeddedVisualizeHandler(
      div,
      {
        vis: mockVis,
        title: 'My Vis',
        searchSource: searchSourceMock,
        destroy: () => ({}),
        copyOnSave: false,
        save: () => Promise.resolve('123'),
      },
      {
        autoFetch: true,
        Private: <T>(provider: () => T) => provider(),
        queryFilter: null,
      }
    );
  });

  afterEach(() => {
    handler.destroy();
  });

  describe('autoFetch', () => {
    it('should trigger a reload when autoFetch=true and auto refresh happens', () => {
      const spy = jest.spyOn(handler, 'fetchAndRender');
      timefilter._triggerAutoRefresh();
      jest.runAllTimers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('should not trigger a reload when autoFetch=false and auto refresh happens', () => {
      handler = new EmbeddedVisualizeHandler(
        div,
        {
          vis: mockVis,
          title: 'My Vis',
          searchSource: searchSourceMock,
          destroy: () => ({}),
          copyOnSave: false,
          save: () => Promise.resolve('123'),
        },
        {
          autoFetch: false,
          Private: <T>(provider: () => T) => provider(),
          queryFilter: null,
        }
      );
      const spy = jest.spyOn(handler, 'fetchAndRender');
      timefilter._triggerAutoRefresh();
      jest.runAllTimers();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getElement', () => {
    it('should return the provided html element', () => {
      expect(handler.getElement()).toBe(div);
    });
  });

  describe('update', () => {
    it('should add provided data- attributes to the html element', () => {
      const spy = jest.spyOn(handler, 'fetchAndRender');
      const params = {
        dataAttrs: { foo: 'bar' },
      };
      handler.update(params);
      expect(spy).not.toHaveBeenCalled();
      expect(handler.getElement()).toMatchSnapshot();
    });

    it('should remove null data- attributes from the html element', () => {
      const spy = jest.spyOn(handler, 'fetchAndRender');
      handler.update({
        dataAttrs: { foo: 'bar' },
      });
      const params = {
        dataAttrs: {
          foo: null,
          baz: 'qux',
        },
      };
      handler.update(params);
      expect(spy).not.toHaveBeenCalled();
      expect(handler.getElement()).toMatchSnapshot();
    });

    it('should call dataLoader.render with updated timeRange', () => {
      const params = { timeRange: { foo: 'bar' } };
      handler.update(params);
      expect(mockDataLoaderFetch).toHaveBeenCalled();
      const callIndex = mockDataLoaderFetch.mock.calls.length - 1;
      const { abortSignal, ...otherParams } = mockDataLoaderFetch.mock.calls[callIndex][0];
      expect(abortSignal).toBeInstanceOf(AbortSignal);
      expect(otherParams).toEqual({ ...dataLoaderParams, ...params });
    });

    it('should call dataLoader.render with updated filters', () => {
      const params = { filters: [{ meta: { disabled: false } }] };
      handler.update(params);
      expect(mockDataLoaderFetch).toHaveBeenCalled();
      const callIndex = mockDataLoaderFetch.mock.calls.length - 1;
      const { abortSignal, ...otherParams } = mockDataLoaderFetch.mock.calls[callIndex][0];
      expect(abortSignal).toBeInstanceOf(AbortSignal);
      expect(otherParams).toEqual({ ...dataLoaderParams, ...params });
    });

    it('should call dataLoader.render with updated query', () => {
      const params = { query: { foo: 'bar' } };
      handler.update(params);
      expect(mockDataLoaderFetch).toHaveBeenCalled();
      const callIndex = mockDataLoaderFetch.mock.calls.length - 1;
      const { abortSignal, ...otherParams } = mockDataLoaderFetch.mock.calls[callIndex][0];
      expect(abortSignal).toBeInstanceOf(AbortSignal);
      expect(otherParams).toEqual({ ...dataLoaderParams, ...params });
    });
  });

  describe('destroy', () => {
    it('should remove vis event listeners', () => {
      const spy = jest.spyOn(mockVis, 'removeListener');
      handler.destroy();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[0][0]).toBe('reload');
      expect(spy.mock.calls[1][0]).toBe('update');
    });

    it('should remove element event listeners', () => {
      const spy = jest.spyOn(handler.getElement(), 'removeEventListener');
      handler.destroy();
      expect(spy).toHaveBeenCalled();
    });

    it('should prevent subsequent renders', () => {
      const spy = jest.spyOn(handler, 'fetchAndRender');
      handler.destroy();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should cancel debounced fetchAndRender', () => {
      const spy = jest.spyOn(handler.debouncedFetchAndRender, 'cancel');
      handler.destroy();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should call abort on controller', () => {
      handler.abortController = new AbortController();
      const spy = jest.spyOn(handler.abortController, 'abort');
      handler.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('openInspector', () => {
    it('calls Inspector.open()', () => {
      handler.openInspector();
      expect(Inspector.open).toHaveBeenCalledTimes(1);
      expect(Inspector.open).toHaveBeenCalledWith({}, { title: 'My Vis' });
    });
  });

  describe('hasInspector', () => {
    it('calls Inspector.isAvailable()', () => {
      handler.hasInspector();
      expect(Inspector.isAvailable).toHaveBeenCalledTimes(1);
      expect(Inspector.isAvailable).toHaveBeenCalledWith({});
    });
  });

  describe('reload', () => {
    it('should force fetch and render', () => {
      const spy = jest.spyOn(handler, 'fetchAndRender');
      handler.reload();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(true);
    });
  });

  describe('data$', () => {
    it('observable can be used to get response data in the correct format', async () => {
      let response;
      handler.data$.subscribe((data: VisResponseData) => (response = data));
      await handler.fetch(true);
      jest.runAllTimers();
      expect(response).toMatchSnapshot();
    });
  });

  describe('render', () => {
    // TODO
  });

  describe('whenFirstRenderComplete', () => {
    // TODO
  });

  describe('addRenderCompleteListener', () => {
    // TODO
  });

  describe('removeRenderCompleteListener', () => {
    // TODO
  });
});
