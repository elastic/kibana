define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');
  var template = require('text!components/typeahead/partials/typeahead.html');

  require('components/notify/directives');

  typeahead.directive('kbnTypeahead', function () {
    var keyMap = {
      ESC: 27,
      UP: 38,
      DOWN: 40,
      TAB: 9,
      ENTER: 13
    };

    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      template: template,
      scope: {
        query: '=query',
        fullItemList: '=items',
      },

      controller: function ($scope) {
        $scope.items = [];
        $scope.hidden = true;

        // internal methods
        this.activate = function (item) {
          $scope.active = item;
        };

        this.isActive = function (item) {
          return item === $scope.active;
        };

        this.select = function (item) {
          $scope.hidden = true;
          $scope.active = false;
          console.log('select', item);
        };

        this.selectActive = function () {
          this.select($scope.active);
        };

        // methods exposed to the view
        $scope.isVisible = function () {
          return !$scope.hidden && ($scope.focused || $scope.mousedOver) && $scope.items.length;
        };

        $scope.eventDispatch = function (keyCode) {
          if (_.contains([keyMap.ESC, keyMap.TAB], keyCode)) {
            $scope.hidden = true;
          }

          if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
            console.log('arrows');
          }

          if (_.contains([keyMap.ENTER], keyCode)) {
            console.log('select', this.select);
          }
        };
      },

      link: function ($scope, $el, attr, ngModel) {
        var $input = $el.find('input').first();
        var $list = $el.find('.typeahead-items').first();

        if (!$input.length) {
          throw new Error('Typeahead must contain an input');
        }

        $scope.$watch('query', function (query) {
          console.log(query);
          // if the query is empty, clear the list items
          if (!query.length) {
            $scope.items = [];
            return;
          }

          // filter items
          $scope.items = $scope.fullItemList.filter(function (item) {
            var re = new RegExp(query, 'i');
            return !!(item.value.match(re));
          });
        });

        $el.on('keydown', function (ev) {
          var keyCode = ev.which || ev.keyCode;
          $scope.hidden = false;

          $scope.eventDispatch(keyCode);
        });

        // control the mouse state
        $list.on('mouseover', function () {
          if ($scope.focused) {
            $scope.$apply(function () {
              $scope.mousedOver = true;
            });
          }
        });

        $list.on('mouseleave', function () {
          $scope.$apply(function () {
            $scope.mousedOver = false;
          });
        });

        // control the focus state
        $input.on('focus', function () {
          console.log('focus');
          $scope.$apply(function () {
            $scope.focused = true;
          });
        });

        $input.on('blur', function () {
          $scope.$apply(function () {
            $scope.focused = false;
          });
        });
      }
    };
  });

  typeahead.directive('kbnTypeaheadItem', function () {
    return {
      restrict: 'A',
      require: '^kbnTypeahead',

      link: function ($scope, $el, attr, typeaheadCtrl) {
        var item = $scope.$eval(attr.kbnTypeaheadItem);

        $el.on('mouseenter', function (e) {
          $scope.$apply(function () {
            typeaheadCtrl.activate(item);
          });
        });

        $el.on('click', function (e) {
          $scope.$apply(function () {
            typeaheadCtrl.select(item);
          });
        });
      }
    };
  });

});
