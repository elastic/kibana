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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../../private';
import { AggParams } from '../agg_params';
import { VisProvider } from '../../vis';
import { fieldFormats } from '../../registry/field_formats';
import { AggType } from '../agg_type';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('AggType Class', function () {
  let indexPattern;
  let Vis;


  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {

    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('constructor', function () {

    it('requires a config object as it\'s first param', function () {
      expect(function () {
        new AggType(null);
      }).to.throwError();
    });

    describe('application of config properties', function () {
      const copiedConfigProps = [
        'name',
        'title',
        'makeLabel',
        'ordered'
      ];

      describe('"' + copiedConfigProps.join('", "') + '"', function () {
        it('assigns the config value to itself', function () {
          const config = _.transform(copiedConfigProps, function (config, prop) {
            config[prop] = {};
          }, {});

          const aggType = new AggType(config);

          copiedConfigProps.forEach(function (prop) {
            expect(aggType[prop]).to.be(config[prop]);
          });
        });
      });

      describe('makeLabel', function () {
        it('makes a function when the makeLabel config is not specified', function () {
          const someGetter = function () {};

          let aggType = new AggType({
            makeLabel: someGetter
          });

          expect(aggType.makeLabel).to.be(someGetter);

          aggType = new AggType({
            name: 'pizza'
          });

          expect(aggType.makeLabel).to.be.a('function');
          expect(aggType.makeLabel()).to.be('pizza');
        });
      });

      describe('getFormat', function () {
        it('returns the formatter for the aggConfig', function () {
          const aggType = new AggType({});

          let vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              {
                type: 'date_histogram',
                schema: 'segment'
              }
            ]
          });

          let aggConfig = vis.aggs.byTypeName.date_histogram[0];

          expect(aggType.getFormat(aggConfig)).to.be(fieldFormats.getDefaultInstance('date'));

          vis = new Vis(indexPattern, {
            type: 'metric',
            aggs: [
              {
                type: 'count',
                schema: 'metric'
              }
            ]
          });
          aggConfig = vis.aggs.byTypeName.count[0];

          expect(aggType.getFormat(aggConfig)).to.be(fieldFormats.getDefaultInstance('string'));
        });

        it('can be overridden via config', function () {
          const someGetter = function () {};

          const aggType = new AggType({
            getFormat: someGetter
          });

          expect(aggType.getFormat).to.be(someGetter);
        });
      });

      describe('params', function () {

        it('defaults to AggParams object with JSON param', function () {
          const aggType = new AggType({
            name: 'smart agg'
          });

          expect(aggType.params).to.be.an(AggParams);
          expect(aggType.params.length).to.be(2);
          expect(aggType.params[0].name).to.be('json');
          expect(aggType.params[1].name).to.be('customLabel');
        });

        it('can disable customLabel', function () {
          const aggType = new AggType({
            name: 'smart agg',
            customLabels: false
          });

          expect(aggType.params.length).to.be(1);
          expect(aggType.params[0].name).to.be('json');
        });

        it('passes the params arg directly to the AggParams constructor', function () {
          const params = [
            { name: 'one' },
            { name: 'two' }
          ];
          const paramLength = params.length + 2; // json and custom label are always appended

          const aggType = new AggType({
            name: 'bucketeer',
            params: params
          });

          expect(aggType.params).to.be.an(AggParams);
          expect(aggType.params.length).to.be(paramLength);
        });
      });

      describe('getResponseAggs', function () {
        it('copies the value', function () {
          const football = {};
          const aggType = new AggType({
            getResponseAggs: football
          });

          expect(aggType.getResponseAggs).to.be(football);
        });

        it('defaults to _.noop', function () {
          const aggType = new AggType({});

          expect(aggType.getResponseAggs).to.be(_.noop);
        });
      });
    });

  });
});
