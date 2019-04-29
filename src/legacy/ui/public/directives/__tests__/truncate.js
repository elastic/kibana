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

const init = function (text) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<kbn-truncated source="' + text + '" length="10"></kbn-truncated>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};

function trimmed(text) {
  return text.trim().replace(/\s+/g, ' ');
}

describe('kbnTruncate directive', function () {

  describe('long strings', function () {

    beforeEach(function () {
      init('some string of text over 10 characters');
    });

    it('should trim long strings', function (done) {
      expect(trimmed($elem.text())).to.be('some … more');
      done();
    });

    it('should have a link to see more text', function (done) {
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');
      done();
    });

    it('should show more text if the link is clicked and less text if clicked again', function (done) {
      $scope.toggle();
      $scope.$digest();
      expect(trimmed($elem.text())).to.be('some string of text over 10 characters less');
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('less');

      $scope.toggle();
      $scope.$digest();
      expect(trimmed($elem.text())).to.be('some … more');
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');

      done();
    });

  });

  describe('short strings', function () {

    beforeEach(function () {
      init('short');
    });

    it('should not trim short strings', function (done) {
      expect(trimmed($elem.text())).to.be('short');
      done();
    });

    it('should not have a link', function (done) {
      expect($elem.find('[ng-click="toggle()"]').length).to.be(0);
      done();
    });

  });

});
