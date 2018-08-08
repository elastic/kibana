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

import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { fieldFormats } from 'ui/registry/field_formats';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesHitsProvider from 'fixtures/hits';
describe('_source formatting', function () {



  describe('Source format', function () {
    let indexPattern;
    let hits;
    let format;
    let convertHtml;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      hits = Private(FixturesHitsProvider);
      format = fieldFormats.getInstance('_source');
      convertHtml = format.getConverterFor('html');
    }));

    it('should use the text content type if a field is not passed', function () {
      const hit = _.first(hits);
      expect(convertHtml(hit._source)).to.be(`<span ng-non-bindable>${JSON.stringify(hit._source)}</span>`);
    });

    it('uses the _source, field, and hit to create a <dl>', function () {
      const hit = _.first(hits);
      const $nonBindable = $(convertHtml(hit._source, indexPattern.fields.byName._source, hit));
      expect($nonBindable.is('span[ng-non-bindable]')).to.be.ok();
      const $dl = $nonBindable.children();
      expect($dl.is('dl')).to.be.ok();
      expect($dl.find('dt')).to.have.length(_.keys(indexPattern.flattenHit(hit)).length);
    });
  });
});
