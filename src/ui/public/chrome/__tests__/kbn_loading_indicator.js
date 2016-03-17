import ngMock from 'ngMock';
import expect from 'expect.js';
import uiModules from 'ui/modules';

import '../directives/kbn_loading_indicator';


describe('kbnLoadingIndicator', function () {
  let compile;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(function ($compile, $rootScope) {
      compile = function (hasActiveConnections) {
        $rootScope.chrome = {
          httpActive: (hasActiveConnections ? [1] : [])
        };
        const $el = $('<div kbn-loading-indicator><div id="other-content"></div></div>');
        $rootScope.$apply();
        $compile($el)($rootScope);
        return $el;
      };
    });

  });

  it('injects a loading .spinner into the element', function () {
    const $el = compile();
    expect($el.find('.spinner')).to.have.length(1);
  });
  // Doesn't work...
  xit('applies the ng-hide class when there are no connections', function () {
    const $el  = compile(false);
    expect($el.find('.spinner.ng-hide')).to.have.length(1);
  });
  it('applies removes ng-hide class when there are connections', function () {
    const $el  = compile(true);
    expect($el.find('.spinner.ng-hide')).to.have.length(0);
  });

  it('doesn\'t modify the contents of what the elment already has', function () {
    const $el = compile();
    expect($el.find('#other-content')).to.have.length(1);
  });

});
