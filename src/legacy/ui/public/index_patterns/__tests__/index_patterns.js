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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';
import { IndexPatternProvider } from '../_index_pattern';
import { IndexPatternsProvider } from '../index_patterns';

describe('IndexPatterns service', function () {
  let indexPatterns;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const IndexPattern = Private(IndexPatternProvider);
    indexPatterns = Private(IndexPatternsProvider);

    // prevent IndexPattern initialization from doing anything
    Private.stub(
      IndexPatternProvider,
      function (...args) {
        const indexPattern = new IndexPattern(...args);
        sinon.stub(indexPattern, 'init', function () {
          return new Promise();
        });
        return indexPattern;
      }
    );
  }));

  it('does not cache gets without an id', function () {
    expect(indexPatterns.get()).to.not.be(indexPatterns.get());
  });

  it('does cache gets for the same id', function () {
    expect(indexPatterns.get(1)).to.be(indexPatterns.get(1));
  });
});
