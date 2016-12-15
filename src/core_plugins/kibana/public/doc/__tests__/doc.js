// Load the kibana app dependencies.
import ngMock from 'ng_mock';
import expect from 'expect.js';
import 'plugins/kibana/doc/index';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

let $scope;
let createController;
let timefilter;

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

    $provide.service('es', function (Private, $q) {
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
            deferred.reject({status: 404});
            break;
          case 'badRequest':
            deferred.reject({status: 500});
            break;
        }

        return deferred.promise;
      };
    });
  });

  // Create the scope
  ngMock.inject(function ($rootScope, $controller, _timefilter_) {
    $scope = $rootScope.$new();
    timefilter = _timefilter_;

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
    expect(timefilter.enabled).to.be(false);
    done();
  });


});
