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
import 'plugins/kibana/discover/index';

let $parentScope;

let $scope;

let $elem;

const init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<span css-truncate ' + (expandable ? 'css-truncate-expandable' : '') + '>this isnt important</span>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};


describe('cssTruncate directive', function () {

  describe('expandable', function () {

    beforeEach(function () {
      init(true);
    });

    it('should set text-overflow to ellipsis and whitespace to nowrap', function (done) {
      expect($elem.css('text-overflow')).to.be('ellipsis');
      expect($elem.css('white-space')).to.be('nowrap');
      done();
    });

    it('should set white-space to normal when clicked, and back to nowrap when clicked again', function (done) {
      $scope.toggle();
      expect($elem.css('white-space')).to.be('normal');

      $scope.toggle();
      expect($elem.css('white-space')).to.be('nowrap');
      done();
    });

  });

});
