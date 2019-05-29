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

// Load the kibana app dependencies.
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import '..';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { timefilter } from 'ui/timefilter';

let $scope;
let createController;

const init = function (index, type, id) {

  ngMock.module('kibana');

  // Stub services
  ngMock.module(function ($provide) {
    $provide.service('$route', function (Private) {
      this.current = {
        locals: {
          indexPattern: Private(FixturesStubbedLogstashIndexPatternProvider)
        },
        params: {
          index: index || 'myIndex',
          type: type || 'myType',
          id: id || 'myId'
        }
      };
    });

    $provide.service('es', function ($q) {
      this.search = function (config) {
        const deferred = $q.defer();

        switch (config.index) {
          case 'goodSearch':
            deferred.resolve({
              hits: {
                total: 1,
                hits: [{
                  _source: {
                    foo: true
                  }
                }]
              }
            });
            break;
          case 'badSearch':
            deferred.resolve({
              hits: {
                total: 0,
                hits: []
              }
            });
            break;
          case 'missingIndex':
            deferred.reject({ status: 404 });
            break;
          case 'badRequest':
            deferred.reject({ status: 500 });
            break;
        }

        return deferred.promise;
      };
    });
  });

  // Create the scope
  ngMock.inject(function ($rootScope, $controller) {
    $scope = $rootScope.$new();

    createController = function () {
      return $controller('doc', {
        '$scope': $scope
      });
    };
  });

  createController();
};


describe('Doc app controller', function () {

  it('should set status=found if the document was found', function (done) {
    init('goodSearch');
    $scope.$digest();
    expect($scope.status).to.be('found');
    done();
  });

  it('should attach the hit to scope', function (done) {
    init('goodSearch');
    $scope.$digest();
    expect($scope.hit).to.be.an(Object);
    expect($scope.hit._source).to.be.an(Object);
    done();
  });

  it('should set status=notFound if the document was missing', function (done) {
    init('badSearch');
    $scope.$digest();
    expect($scope.status).to.be('notFound');
    done();
  });

  it('should set status=notFound if the request returns a 404', function (done) {
    init('missingIndex');
    $scope.$digest();
    expect($scope.status).to.be('notFound');
    done();
  });

  it('should set status=error if the request fails with any other code', function (done) {
    init('badRequest');
    $scope.$digest();
    expect($scope.status).to.be('error');
    done();
  });

  it('should disable the time filter', function (done) {
    init();
    expect(timefilter.isAutoRefreshSelectorEnabled).to.be(false);
    expect(timefilter.isTimeRangeSelectorEnabled).to.be(false);
    done();
  });


});
