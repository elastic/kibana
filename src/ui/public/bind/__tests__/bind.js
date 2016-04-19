import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
describe('$scope.$bind', function () {

  let $rootScope;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
  }));

  it('exposes $bind on all scopes', function () {
    expect($rootScope.$bind).to.be.a('function');
    expect($scope).to.have.property('$bind', $rootScope.$bind);

    let $isoScope = $scope.$new(true);
    expect($isoScope).to.have.property('$bind', $rootScope.$bind);
  });

  it('sets up binding from a parent scope to it\'s child', function () {
    $rootScope.val = 'foo';
    $scope.$bind('localVal', 'val');
    expect($scope.localVal).to.be('foo');

    $rootScope.val = 'bar';
    expect($scope.localVal).to.be('foo'); // shouldn't have changed yet

    $rootScope.$apply();
    expect($scope.localVal).to.be('bar');
  });

  it('sets up a binding from the child to the parent scope', function () {
    let stub = sinon.stub();

    $rootScope.val = 'foo';
    $scope.$bind('localVal', 'val');
    expect($scope.localVal).to.be('foo');

    $scope.localVal = 'bar';
    expect($rootScope.val).to.be('foo'); // shouldn't have changed yet

    $scope.$apply();
    expect($rootScope.val).to.be('bar');
  });

  it('pulls from the scopes $parent by default', function () {
    let $parent = $rootScope.$new();
    let $self = $parent.$new();

    $parent.val = 'foo';
    $self.val = 'bar';

    $self.$bind('localVal', 'val');
    expect($self.localVal).to.be('foo');
  });

  it('accepts an alternate scope to read from', function () {
    let $parent = $rootScope.$new();
    let $self = $parent.$new();

    $parent.val = 'foo';
    $self.val = 'bar';

    $self.$bind('localVal', 'val', $self);
    expect($self.localVal).to.be('bar');
  });
});
