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

import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { VisProvider } from '..';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisTypesRegistryProvider } from '../../registry/vis_types';

describe('Vis Class', function () {
  let indexPattern;
  let Vis;
  let visTypes;

  let vis;
  const stateFixture = {
    type: 'pie',
    aggs: [
      { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
      { type: 'terms', schema: 'segment', params: { field: 'machine.os' } },
      { type: 'terms', schema: 'segment', params: { field: 'geo.src' } }
    ],
    params: { isDonut: true },
    listeners: { click: _.noop }
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    visTypes = Private(VisTypesRegistryProvider);
  }));

  beforeEach(function () {
    vis = new Vis(indexPattern, stateFixture);
  });

  const verifyVis = function (vis) {
    expect(vis).to.have.property('aggs');
    expect(vis.aggs).to.have.length(3);

    expect(vis).to.have.property('type');
    expect(vis.type).to.eql(visTypes.byName.pie);

    expect(vis).to.have.property('params');
    expect(vis.params).to.have.property('isDonut', true);
    expect(vis).to.have.property('indexPattern', indexPattern);
  };

  describe('initialization', function () {
    it('should set the state', function () {
      verifyVis(vis);
    });
  });

  describe('getState()', function () {
    it('should get a state that represents the... er... state', function () {
      const state = vis.getEnabledState();
      expect(state).to.have.property('type', 'pie');

      expect(state).to.have.property('params');
      expect(state.params).to.have.property('isDonut', true);

      expect(state).to.have.property('aggs');
      expect(state.aggs).to.have.length(3);
    });
  });

  describe('setState()', function () {
    it('should set the state to defaults', function () {
      const vis = new Vis(indexPattern);
      expect(vis).to.have.property('type');
      expect(vis.type).to.eql(visTypes.byName.histogram);
      expect(vis).to.have.property('aggs');
      expect(vis.aggs).to.have.length(1);
      expect(vis).to.have.property('params');
      expect(vis.params).to.have.property('addLegend', true);
      expect(vis.params).to.have.property('addTooltip', true);
    });
  });

  describe('isHierarchical()', function () {
    it('should return true for hierarchical vis (like pie)', function () {
      expect(vis.isHierarchical()).to.be(true);
    });
    it('should return false for non-hierarchical vis (like histogram)', function () {
      const vis = new Vis(indexPattern);
      expect(vis.isHierarchical()).to.be(false);
    });
  });

});
