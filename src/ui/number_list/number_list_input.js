define(function (require) {
  var $ = require('jquery');
  var _ = require('lodash');
  var keyMap = require('utils/key_map');

  var INVALID = {}; // invalid flag
  var FLOATABLE = /^[\d\.e\-\+]+$/i;

  var VALIDATION_ERROR = 'numberListRangeAndOrder';
  var DIRECTIVE_ATTR = 'kbn-number-list-input';

  require('ui/modules')
  .get('kibana')
  .directive('kbnNumberListInput', function ($parse) {
    return {
      restrict: 'A',
      require: ['ngModel', '^kbnNumberList'],
      link: function ($scope, $el, attrs, controllers) {
        var ngModelCntr = controllers[0];
        var numberListCntr = controllers[1];

        var $setModel = $parse(attrs.ngModel).assign;
        var $repeater = $el.closest('[ng-repeat]');

        var handlers = {
          up: change(add, 1),
          'shift-up': change(addTenth, 1),

          down: change(add, -1),
          'shift-down': change(addTenth, -1),

          tab: go('next'),
          'shift-tab': go('prev'),

          'shift-enter': numberListCntr.add,

          backspace: removeIfEmpty,
          delete: removeIfEmpty
        };

        function removeIfEmpty(event) {
          if (!ngModelCntr.$viewValue) {
            $get('prev').focus();
            numberListCntr.remove($scope.$index);
            event.preventDefault();
          }

          return false;
        }

        function $get(dir) {
          return $repeater[dir]().find('[' + DIRECTIVE_ATTR + ']');
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
          id.push(keyMap[event.keyCode] || event.keyCode);
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
            if (dec < 0) {
              dec = 10 + (dec % 10);
            } else {
              dec = dec % 10;
            }
          }

          return parse(int + '.' + dec);
        }

        function change(using, mod) {
          return function () {
            var str = String(ngModelCntr.$viewValue);
            var val = parse(str);
            if (val === INVALID) return;

            var next = using(mod, val, str);
            if (next === INVALID) return;

            $el.val(next);
            ngModelCntr.$setViewValue(next);
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
          var num = viewValue;

          if (typeof num !== 'number' || isNaN(num)) {
            // parse non-numbers
            num = String(viewValue || 0).trim();
            if (!FLOATABLE.test(num)) return INVALID;

            num = parseFloat(num);
            if (isNaN(num)) return INVALID;
          }

          var range = numberListCntr.range;
          if (!range.within(num)) return INVALID;

          if ($scope.$index > 0) {
            var i = $scope.$index - 1;
            var list = numberListCntr.getList();
            var prev = list[i];
            if (num <= prev) return INVALID;
          }

          return num;
        }

        $scope.$watchMulti([
          '$index',
          {
            fn: $scope.$watchCollection,
            get: function () {
              return numberListCntr.getList();
            }
          }
        ], function () {
          var valid = parse(ngModelCntr.$viewValue) !== INVALID;
          ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
        });

        function validate(then) {
          return function (input) {
            var value = parse(input);
            var valid = value !== INVALID;
            value = valid ? value : input;
            ngModelCntr.$setValidity(VALIDATION_ERROR, valid);
            then && then(input, value);
            return value;
          };
        }

        ngModelCntr.$parsers.push(validate());
        ngModelCntr.$formatters.push(validate(function (input, value) {
          if (input !== value) $setModel($scope, value);
        }));

        if (parse(ngModelCntr.$viewValue) === INVALID) {
          ngModelCntr.$setTouched();
        }
      }
    };
  });

});
