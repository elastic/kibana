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
        var self = this;
        $scope.items = [];
        $scope.hidden = true;

        // activation methods
        self.activate = function (item) {
          $scope.active = item;
        };

        self.getActiveIndex = function () {
          if (!$scope.active) {
            return;
          }

          return $scope.items.indexOf($scope.active);
        };

        self.activateNext = function () {
          var index = self.getActiveIndex();
          if (index == null) {
            index = 0;
          } else if (index < $scope.items.length - 1) {
            ++index;
          }

          $scope.active = $scope.items[index];
        };

        self.activatePrev = function () {
          var index = self.getActiveIndex();

          if (index > 0 && index != null) {
            --index;
          } else if (index === 0) {
            $scope.active = false;
            return;
          }

          $scope.active = $scope.items[index];
        };

        self.isActive = function (item) {
          return item === $scope.active;
        };

        // selection methods
        self.select = function (item) {
          $scope.hidden = true;
          $scope.active = false;
          $scope.$input.val(item.value);
        };

        self.selectActive = function () {
          if ($scope.active) {
            self.select($scope.active);
          }
        };

        // methods exposed to the view
        $scope.isVisible = function () {
          return !$scope.hidden && ($scope.focused || $scope.mousedOver) && $scope.items.length;
        };

        $scope.keypressHandler = function (ev) {
          var keyCode = ev.which || ev.keyCode;

          // hide on escape
          if (_.contains([keyMap.ESC], keyCode)) {
            $scope.hidden = true;
          }

          // change selection with arrow up/down
          if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
            if ($scope.isVisible && $scope.items.length) {
              ev.preventDefault();

              if (keyCode === keyMap.DOWN) {
                self.activateNext();
              } else {
                self.activatePrev();
              }
            }
          }

          // select on enter or tab
          if (_.contains([keyMap.ENTER, keyMap.TAB], keyCode)) {
            self.selectActive();
          }
        };
      },

      link: function ($scope, $el, attr, ngModel) {
        var $input = $scope.$input = $el.find('input').first();
        var $list = $el.find('.typeahead-items').first();

        if (!$input.length) {
          throw new Error('Typeahead must contain an input');
        }

        // watch for changes to the query parameter
        $scope.$watch('query', function (query) {
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

        // when items list changes, deactivate if no results or active result is gone
        $scope.$watch('items', function (items) {
          if (!items.length || !_.contains($scope.items, $scope.active)) {
            $scope.active = false;
          }
        });

        // handle keypresses
        $el.on('keydown', function (ev) {
          // unhide on keypress
          $scope.hidden = false;

          // react to specific key presses
          if ($scope.focused) {
            $scope.$apply(function () {
              $scope.keypressHandler(ev);
            });
          }
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
            $scope.active = false;
            if (!$scope.focused) {
              $scope.hidden = true;
            }
          });
        });

        // control the focus state
        $input.on('focus', function () {
          $scope.$apply(function () {
            $scope.hidden = true;
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

        $scope.$watch(function () {
          return typeaheadCtrl.isActive(item);
        }, function (active) {
          if (active) {
            $el.addClass('active');
          } else {
            $el.removeClass('active');
          }
        });

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
