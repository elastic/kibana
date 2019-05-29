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

import angular from 'angular';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { cloneDeep } from 'lodash';

import { setupAndTeardownInjectorStub } from 'test_utils/stub_get_active_injector';

import FixturesStubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

import { VisProvider } from '../../../vis';
import { getVisualizeLoader } from '../visualize_loader';
import { EmbeddedVisualizeHandler } from '../embedded_visualize_handler';
import { Inspector } from '../../../inspector/inspector';
import { dispatchRenderComplete } from '../../../render_complete';
import { PipelineDataLoader } from '../pipeline_data_loader';
import { VisualizeDataLoader } from '../visualize_data_loader';
import { PersistedState } from '../../../persisted_state';
import { DataAdapter } from '../../../inspector/adapters/data';
import { RequestAdapter } from '../../../inspector/adapters/request';

describe('visualize loader', () => {

  let DataLoader;
  let searchSource;
  let vis;
  let $rootScope;
  let loader;
  let mockedSavedObject;
  let sandbox;

  function createSavedObject() {
    return {
      vis,
      searchSource,
    };
  }

  async function timeout(delay = 0) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  function newContainer() {
    return angular.element('<div></div>');
  }

  function embedWithParams(params) {
    const container = newContainer();
    loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), params);
    $rootScope.$digest();
    return container.find('[data-test-subj="visualizationLoader"]');
  }

  beforeEach(ngMock.module('kibana', 'kibana/directive'));
  beforeEach(ngMock.inject((_$rootScope_, savedVisualizations, interpreterConfig, Private) => {
    $rootScope = _$rootScope_;
    searchSource = Private(FixturesStubbedSearchSourceProvider);
    const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    DataLoader = interpreterConfig.enableInVisualize ? PipelineDataLoader : VisualizeDataLoader;
    // Create a new Vis object
    const Vis = Private(VisProvider);
    vis = new Vis(indexPattern, {
      type: 'pie',
      title: 'testVis',
      params: {},
      aggs: [
        { type: 'count', schema: 'metric' },
        {
          type: 'range',
          schema: 'bucket',
          params: {
            field: 'bytes',
            ranges: [
              { from: 0, to: 1000 },
              { from: 1000, to: 2000 }
            ]
          }
        }
      ]
    });
    vis.type.requestHandler = 'courier';
    vis.type.responseHandler = 'none';
    vis.type.requiresSearch = false;

    // Setup savedObject
    mockedSavedObject = createSavedObject();

    sandbox = sinon.sandbox.create();
    // Mock savedVisualizations.get to return 'mockedSavedObject' when id is 'exists'
    sandbox.stub(savedVisualizations, 'get').callsFake((id) =>
      id === 'exists' ? Promise.resolve(mockedSavedObject) : Promise.reject()
    );
  }));
  setupAndTeardownInjectorStub();
  beforeEach(async () => {
    loader = await getVisualizeLoader();
  });

  afterEach(() => {
    if (sandbox) {
      sandbox.restore();
    }
  });

  describe('getVisualizeLoader', () => {

    it('should return a promise', () => {
      expect(getVisualizeLoader().then).to.be.a('function');
    });

    it('should resolve to an object', async () => {
      const visualizeLoader = await getVisualizeLoader();
      expect(visualizeLoader).to.be.an('object');
    });

  });

  describe('service', () => {

    describe('getVisualizationList', () => {

      it('should be a function', async () => {
        expect(loader.getVisualizationList).to.be.a('function');
      });

    });

    describe('embedVisualizationWithSavedObject', () => {

      it('should be a function', () => {
        expect(loader.embedVisualizationWithSavedObject).to.be.a('function');
      });

      it('should render the visualize element', () => {
        const container = newContainer();
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), { });
        expect(container.find('[data-test-subj="visualizationLoader"]').length).to.be(1);
      });

      it('should not mutate vis.params', () => {
        const container = newContainer();
        const savedObject = createSavedObject();
        const paramsBefore = cloneDeep(vis.params);
        loader.embedVisualizationWithSavedObject(container[0], savedObject, { });
        const paramsAfter = cloneDeep(vis.params);
        expect(paramsBefore).to.eql(paramsAfter);
      });

      it('should replace content of container by default', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        expect(container.find('#prevContent').length).to.be(0);
      });

      it('should append content to container when using append parameter', () => {
        const container = angular.element('<div><div id="prevContent"></div></div>');
        loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {
          append: true
        });
        expect(container.children().length).to.be(2);
        expect(container.find('#prevContent').length).to.be(1);
      });

      it('should apply css classes from parameters', () => {
        const vis = embedWithParams({ cssClass: 'my-css-class another-class' });
        expect(vis.hasClass('my-css-class')).to.be(true);
        expect(vis.hasClass('another-class')).to.be(true);
      });

      it('should apply data attributes from dataAttrs parameter', () => {
        const vis = embedWithParams({
          dataAttrs: {
            'foo': '',
            'with-dash': 'value',
          }
        });
        expect(vis.attr('data-foo')).to.be('');
        expect(vis.attr('data-with-dash')).to.be('value');
      });
    });

    describe('embedVisualizationWithId', () => {

      it('should be a function', async () => {
        expect(loader.embedVisualizationWithId).to.be.a('function');
      });

      it('should reject if the id was not found', () => {
        const resolveSpy = sinon.spy();
        const rejectSpy = sinon.spy();
        const container = newContainer();
        return loader.embedVisualizationWithId(container[0], 'not-existing', {})
          .then(resolveSpy, rejectSpy)
          .then(() => {
            expect(resolveSpy.called).to.be(false);
            expect(rejectSpy.calledOnce).to.be(true);
          });
      });

      it('should render a visualize element, if id was found', async () => {
        const container = newContainer();
        await loader.embedVisualizationWithId(container[0], 'exists', {});
        expect(container.find('[data-test-subj="visualizationLoader"]').length).to.be(1);
      });

    });

    describe('EmbeddedVisualizeHandler', () => {
      it('should be returned from embedVisualizationWithId via a promise', async () => {
        const handler = await loader.embedVisualizationWithId(newContainer()[0], 'exists', {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should be returned from embedVisualizationWithSavedObject', async () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
        expect(handler instanceof EmbeddedVisualizeHandler).to.be(true);
      });

      it('should give access to the visualize element', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        expect(handler.getElement()).to.be(container.find('[data-test-subj="visualizationLoader"]')[0]);
      });

      it('should allow opening the inspector of the visualization and return its session', () => {
        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
        sandbox.spy(Inspector, 'open');
        const inspectorSession = handler.openInspector();
        expect(Inspector.open.calledOnce).to.be(true);
        expect(inspectorSession.close).to.be.a('function');
        inspectorSession.close();
      });

      describe('inspector', () => {

        describe('hasInspector()', () => {
          it('should forward to inspectors hasInspector', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            sinon.spy(Inspector, 'isAvailable');
            handler.hasInspector();
            expect(Inspector.isAvailable.calledOnce).to.be(true);
            const adapters = Inspector.isAvailable.lastCall.args[0];
            expect(adapters.data).to.be.a(DataAdapter);
            expect(adapters.requests).to.be.a(RequestAdapter);
          });

          it('should return hasInspectors result', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            const stub = sinon.stub(Inspector, 'isAvailable');
            stub.returns(true);
            expect(handler.hasInspector()).to.be(true);
            stub.returns(false);
            expect(handler.hasInspector()).to.be(false);
          });

          afterEach(() => {
            Inspector.isAvailable.restore();
          });
        });

        describe('openInspector()', () => {

          beforeEach(() => {
            sinon.stub(Inspector, 'open');
          });

          it('should call openInspector with all attached inspectors', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            handler.openInspector();
            expect(Inspector.open.calledOnce).to.be(true);
            const adapters = Inspector.open.lastCall.args[0];
            expect(adapters).to.be(handler.inspectorAdapters);
          });

          it('should pass the vis title to the openInspector call', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            handler.openInspector();
            expect(Inspector.open.calledOnce).to.be(true);
            const params = Inspector.open.lastCall.args[1];
            expect(params.title).to.be('testVis');
          });

          afterEach(() => {
            Inspector.open.restore();
          });
        });

        describe('inspectorAdapters', () => {

          it('should register none for none requestHandler', () => {
            const savedObj = createSavedObject();
            savedObj.vis.type.requestHandler = 'none';
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], savedObj, {});
            expect(handler.inspectorAdapters).to.eql({});
          });

          it('should attach data and request handler for courier', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            expect(handler.inspectorAdapters.data).to.be.a(DataAdapter);
            expect(handler.inspectorAdapters.requests).to.be.a(RequestAdapter);
          });

          it('should allow enabling data adapter manually', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            expect(handler.inspectorAdapters.data).to.be.a(DataAdapter);
          });

          it('should allow enabling requests adapter manually', () => {
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {});
            expect(handler.inspectorAdapters.requests).to.be.a(RequestAdapter);
          });

          it('should allow adding custom inspector adapters via the custom key', () => {
            const Foodapter =  class {};
            const Bardapter = class {};
            const savedObj = createSavedObject();
            savedObj.vis.type.inspectorAdapters = {
              custom: { foo: Foodapter, bar: Bardapter }
            };
            const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], savedObj, {});
            expect(handler.inspectorAdapters.foo).to.be.a(Foodapter);
            expect(handler.inspectorAdapters.bar).to.be.a(Bardapter);
          });

          it('should not share adapter instances between vis instances', () => {
            const Foodapter = class {};
            const savedObj1 = createSavedObject();
            const savedObj2 = createSavedObject();
            savedObj1.vis.type.inspectorAdapters = { custom: { foo: Foodapter } };
            savedObj2.vis.type.inspectorAdapters = { custom: { foo: Foodapter } };
            const handler1 = loader.embedVisualizationWithSavedObject(newContainer()[0], savedObj1, {});
            const handler2 = loader.embedVisualizationWithSavedObject(newContainer()[0], savedObj2, {});
            expect(handler1.inspectorAdapters.foo).to.be.a(Foodapter);
            expect(handler2.inspectorAdapters.foo).to.be.a(Foodapter);
            expect(handler1.inspectorAdapters.foo).not.to.be(handler2.inspectorAdapters.foo);
            expect(handler1.inspectorAdapters.data).to.be.a(DataAdapter);
            expect(handler2.inspectorAdapters.data).to.be.a(DataAdapter);
            expect(handler1.inspectorAdapters.data).not.to.be(handler2.inspectorAdapters.data);
          });
        });

      });

      it('should have whenFirstRenderComplete returns a promise resolving on first renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.whenFirstRenderComplete().then(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should add listeners via addRenderCompleteListener that triggers on renderComplete events', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        await timeout();
        expect(spy.calledOnce).to.be(true);
      });

      it('should call render complete listeners once per renderComplete event', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.callCount).to.be(3);
      });

      it('should successfully remove listeners from render complete', async () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {});
        const spy = sinon.spy();
        handler.addRenderCompleteListener(spy);
        expect(spy.notCalled).to.be(true);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.calledOnce).to.be(true);
        spy.resetHistory();
        handler.removeRenderCompleteListener(spy);
        dispatchRenderComplete(container.find('[data-test-subj="visualizationLoader"]')[0]);
        expect(spy.notCalled).to.be(true);
      });


      it('should allow updating and deleting data attributes', () => {
        const container = newContainer();
        const handler = loader.embedVisualizationWithSavedObject(container[0], createSavedObject(), {
          dataAttrs: {
            foo: 42
          }
        });
        expect(container.find('[data-test-subj="visualizationLoader"]').attr('data-foo')).to.be('42');
        handler.update({
          dataAttrs: {
            foo: null,
            added: 'value',
          }
        });
        expect(container.find('[data-test-subj="visualizationLoader"]')[0].hasAttribute('data-foo')).to.be(false);
        expect(container.find('[data-test-subj="visualizationLoader"]').attr('data-added')).to.be('value');
      });

      it('should allow updating the time range of the visualization', async () => {
        const spy = sandbox.spy(DataLoader.prototype, 'fetch');

        const handler = loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {
          timeRange: { from: 'now-7d', to: 'now' }
        });

        // Wait for the initial fetch and render to happen
        await timeout(150);
        spy.resetHistory();

        handler.update({
          timeRange: { from: 'now-10d/d', to: 'now' }
        });

        // Wait for fetch debounce to happen (as soon as we use lodash 4+ we could use fake timers here for the debounce)
        await timeout(150);

        sinon.assert.calledOnce(spy);
        sinon.assert.calledWith(spy, sinon.match({ timeRange: { from: 'now-10d/d', to: 'now' } }));
      });

      it('should not set forceFetch on uiState change', async () => {
        const spy = sandbox.spy(DataLoader.prototype, 'fetch');

        const uiState = new PersistedState();
        loader.embedVisualizationWithSavedObject(newContainer()[0], createSavedObject(), {
          timeRange: { from: 'now-7d', to: 'now' },
          uiState: uiState,
        });

        // Wait for the initial fetch and render to happen
        await timeout(150);
        spy.resetHistory();

        uiState.set('property', 'value');

        // Wait for fetch debounce to happen (as soon as we use lodash 4+ we could use fake timers here for the debounce)
        await timeout(150);

        sinon.assert.calledOnce(spy);
        sinon.assert.calledWith(spy, sinon.match({ forceFetch: false }));
      });
    });

  });
});
