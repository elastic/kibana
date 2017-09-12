import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../scrollto_activedescendant';

describe('scrolltoActivedescendant directive', () => {
  let $compile;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((_$compile_, _$rootScope_) => {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should call scrollIntoView on aria-activedescendant changes', () => {
    const scope = $rootScope.$new();
    scope.ad = '';
    const element = $compile(`<div aria-activedescendant="{{ad}}" scrollto-activedescendant>
      <span id="child1"></span>
      <span id="child2"></span>
    </div>`)(scope);
    const child1 = element.find('#child1');
    const child2 = element.find('#child2');
    sinon.spy(child1[0], 'scrollIntoView');
    sinon.spy(child2[0], 'scrollIntoView');
    scope.ad = 'child1';
    scope.$digest();
    expect(child1[0].scrollIntoView.calledOnce).to.be.eql(true);
    scope.ad = 'child2';
    scope.$digest();
    expect(child2[0].scrollIntoView.calledOnce).to.be.eql(true);
  });

});
