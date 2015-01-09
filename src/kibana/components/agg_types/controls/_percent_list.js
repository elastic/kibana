define(function (require) {
  var $ = require('jquery');
  var _ = require('lodash');

  var INVALID = {}; // invalid flag
  var FLOATABLE = /^[\d\.e\-\+]+$/i;

  require('modules')
  .get('kibana')
  .directive('percentList', function ($parse) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function ($scope, $el, attrs, ngModelController) {
        var $repeater = $el.closest('[ng-repeat]');
        var $listGetter = $parse(attrs.percentList);

        var namedKeys = {
          13: 'enter',
          38: 'up',
          40: 'down',
          9: 'tab',
          8: 'delete',
          46: 'delete'
        };

        var handlers = {
          'up': change(add, 1),
          'shift-up': change(addTenth, 1),

          'down': change(add, -1),
          'shift-down': change(addTenth, -1),

          'tab': go('next'),
          'shift-tab': go('prev'),

          'delete': function (event) {
            if ($el.val() === '') {
              $get('prev').focus();
              $scope.remove($scope.$index);
              event.preventDefault();
            }

            return false;
          }
        };

        function $get(dir) {
          return $repeater[dir]().find('[percent-list]');
        }

        function go(dir) {
          return function () {
            var $to = $get(dir);
            if ($to.size()) $to.focus();
            else return false;
          };
        }

        function idKey(event) {
          var id = [];
          if (event.ctrlKey) id.push('ctrl');
          if (event.shiftKey) id.push('shift');
          if (event.metaKey) id.push('meta');
          if (event.altKey) id.push('alt');
          id.push(namedKeys[event.keyCode] || event.keyCode);
          return id.join('-');
        }

        function add(n, val) {
          return parse(val + n);
        }

        function addTenth(n, val, str) {
          var int = Math.floor(val);
          var dec = parseInt(str.split('.')[1] || 0, 10);
          dec = dec + parseInt(n, 10);

          if (dec < 0 || dec > 9) {
            int += Math.floor(dec / 10);
            dec = dec % 10;
          }

          return parse(int + '.' + dec);
        }

        function change(using, mod) {
          return function () {
            var str = String(ngModelController.$viewValue);
            var val = parse(str);
            if (val === INVALID) return;

            var next = using(mod, val, str);
            if (next === INVALID) return;

            $el.val(next);
            ngModelController.$setViewValue(next);
          };
        }

        function onKeydown(event) {
          var handler = handlers[idKey(event)];
          if (!handler) return;

          if (handler(event) !== false) {
            event.preventDefault();
          }

          $scope.$apply();
        }

        $el.on('keydown', onKeydown);
        $scope.$on('$destroy', function () {
          $el.off('keydown', onKeydown);
        });

        function parse(viewValue) {
          viewValue = String(viewValue || 0);
          var num = viewValue.trim();
          if (!FLOATABLE.test(num)) return INVALID;
          num = parseFloat(num);
          if (isNaN(num)) return INVALID;

          var list = $listGetter($scope);
          var min = list[$scope.$index - 1] || 0;
          var max = list[$scope.$index + 1] || 100;

          if (num <= min || num >= max) return INVALID;

          return num;
        }

        $scope.$watchMulti([
          '$index',
          {
            fn: $scope.$watchCollection,
            get: function () {
              return $listGetter($scope);
            }
          }
        ], function () {
          var valid = parse(ngModelController.$viewValue) !== INVALID;
          ngModelController.$setValidity('percentList', valid);
        });

        ngModelController.$parsers.push(function (viewValue) {
          var value = parse(viewValue);
          var valid = value !== INVALID;
          ngModelController.$setValidity('percentList', valid);
          return valid ? value : void 0;
        });
      }
    };
  });

});