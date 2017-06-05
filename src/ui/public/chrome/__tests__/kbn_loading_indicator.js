import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';

import '../directives/loading_indicator/loading_indicator';

describe('kbnLoadingIndicator', function () {
  let compile;

  beforeEach(() => {
    ngMock.module('kibana');
    ngMock.inject(function ($compile, $rootScope) {
      compile = function (hasActiveConnections) {
        $rootScope.chrome = {
          httpActive: hasActiveConnections ? [1] : []
        };
        const $el = $('<kbn-loading-indicator></kbn-loading-indicator>');
        $compile($el)($rootScope);
        $rootScope.$apply();
        return $el;
      };
    });

  });

  it(`doesn't have ng-hide class when there are connections`, function () {
    const $el = compile(true);
    expect($el.hasClass('ng-hide')).to.be(false);
  });

  it('has ng-hide class when there are no connections', function () {
    const $el = compile(false);
    expect($el.hasClass('ng-hide')).to.be(true);
  });
});
