import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('markdown vis controller', function () {
  let $scope;
  let $el;

  beforeEach(ngMock.module('kibana/markdown_vis'));
  beforeEach(ngMock.inject(function ($rootScope, $controller) {
    $scope = $rootScope.$new();
    $controller('KbnMarkdownVisController', {$scope: $scope});
    $scope.$digest();
  }));

  it('should set html from markdown params', function () {
    expect($scope).to.not.have.property('html');
    $scope.vis = {
      params: {
        markdown: 'This is a test of the [markdown](http://daringfireball.net/projects/markdown) vis.'
      }
    };
    $scope.$digest();

    expect($scope).to.have.property('html');
    expect($scope.html.toString().indexOf('<a href')).to.be.greaterThan(-1);
  });
});
