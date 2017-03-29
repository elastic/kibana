import $ from 'jquery';
import expect from 'expect.js';
import simulateKeys from 'test_utils/simulate_keys';
import ngMock from 'ng_mock';
import 'ui/number_list';
describe('NumberList directive', function () {


  let $el;
  let $scope;
  let compile;

  function onlyValidValues() {
    return $el.find('[ng-model]').toArray().map(function (el) {
      const ngModel = $(el).controller('ngModel');
      return ngModel.$valid ? ngModel.$modelValue : undefined;
    });
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    const $compile = $injector.get('$compile');
    const $rootScope = $injector.get('$rootScope');

    $scope = $rootScope.$new();
    $el = $('<kbn-number-list ng-model="vals">');
    compile = function (vals, range) {
      $scope.vals = vals || [];
      $el.attr('range', range);

      $compile($el)($scope);
      $scope.$apply();
    };
  }));

  afterEach(function () {
    $el.remove();
    $scope.$destroy();
  });

  it('fails on invalid numbers', function () {
    compile([1, 'foo']);
    expect(onlyValidValues()).to.eql([1, undefined]);
  });

  it('supports decimals', function () {
    compile(['1.2', '000001.6', '99.10']);
    expect(onlyValidValues()).to.eql([1.2, 1.6, 99.1]);
  });

  it('ensures that the values are in order', function () {
    compile([1, 2, 3, 10, 4, 5]);
    expect(onlyValidValues()).to.eql([1, 2, 3, 10, undefined, 5]);
  });

  it('requires that values are within a range', function () {
    compile([50, 100, 200, 250], '[100, 200)');
    expect(onlyValidValues()).to.eql([undefined, 100, undefined, undefined]);
  });

  describe('listens for keyboard events', function () {
    it('up arrow increases by 1', function () {
      compile([1]);

      return simulateKeys(
        function () { return $el.find('input').first(); },
        ['up', 'up', 'up']
      )
      .then(function () {
        expect(onlyValidValues()).to.eql([4]);
      });
    });

    it('shift-up increases by 0.1', function () {
      compile([4.8]);

      const seq = [
        {
          type: 'press',
          key: 'shift',
          events: [
            'up',
            'up',
            'up'
          ]
        }
      ];

      return simulateKeys(
        function () { return $el.find('input').first(); },
        seq
      )
      .then(function () {
        expect(onlyValidValues()).to.eql([5.1]);
      });
    });

    it('down arrow decreases by 1', function () {
      compile([5]);

      return simulateKeys(
        function () { return $el.find('input').first(); },
        ['down', 'down', 'down']
      )
      .then(function () {
        expect(onlyValidValues()).to.eql([2]);
      });
    });

    it('shift-down decreases by 0.1', function () {
      compile([5.1]);

      const seq = [
        {
          type: 'press',
          key: 'shift',
          events: [
            'down',
            'down',
            'down'
          ]
        }
      ];

      return simulateKeys(
        function () { return $el.find('input').first(); },
        seq
      )
      .then(function () {
        expect(onlyValidValues()).to.eql([4.8]);
      });
    });

    it('maintains valid number', function () {
      compile([9, 11, 13]);

      const seq = [
        'down', // 10 (11 - 1)
        'down'  // 10 (limited by 9)
      ];

      const getEl = function () { return $el.find('input').eq(1); };

      return simulateKeys(getEl, seq)
      .then(function () {
        expect(onlyValidValues()).to.eql([9, 10, 13]);
      });
    });
  });
});
