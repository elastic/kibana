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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
describe('styleCompile directive', function() {
  let config;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      config = $injector.get('config');
      $rootScope = $injector.get('$rootScope');
    })
  );

  it('exports a few config values as css', function() {
    const $style = $('#style-compile');

    config.set('truncate:maxHeight', 0);
    $rootScope.$apply();
    expect($style.html().trim()).to.be(
      [
        '.truncate-by-height {',
        '  max-height: none;',
        '  display: inline-block;',
        '}',
        '.truncate-by-height:before {',
        '  top: -15px;',
        '}',
      ].join('\n')
    );

    config.set('truncate:maxHeight', 15);
    $rootScope.$apply();
    expect($style.html().trim()).to.be(
      [
        '.truncate-by-height {',
        '  max-height: 15px !important;',
        '  display: inline-block;',
        '}',
        '.truncate-by-height:before {',
        '  top: 0px;',
        '}',
      ].join('\n')
    );
  });
});
