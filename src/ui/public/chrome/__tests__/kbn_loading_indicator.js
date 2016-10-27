import ngMock from 'ng_mock';
import expect from 'expect.js';
import uiModules from 'ui/modules';
import $ from 'jquery';

import '../directives/loading_indicator/loading_indicator';

describe('kbnLoadingIndicator', function () {
  let compile;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(function ($compile, $rootScope) {
      compile = function (hasActiveConnections) {
        $rootScope.chrome = {
          httpActive: (hasActiveConnections ? [1] : [])
        };
        const $el = $('<kbn-loading-indicator></kbn-loading-indicator>');
        $rootScope.$apply();
        $compile($el)($rootScope);
        return $el;
      };
    });

  });

  it('injects a loading .loadingIndicator into the element', function () {
    const $el = compile();
    expect($el.find('.loadingIndicator')).to.have.length(1);
  });
  it('applies removes ng-hide class when there are connections', function () {
    const $el  = compile(true);
    expect($el.find('.loadingIndicator.ng-hide')).to.have.length(0);
  });
});
