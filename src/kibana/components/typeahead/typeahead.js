define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');
  var template = require('text!components/typeahead/partials/typeahead.html');
  var listTemplate = require('text!components/typeahead/partials/typeahead-items.html');

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
      restrict: 'A',
      transclude: true,
      template: template,
      scope: {
        items: '=kbnTypeahead',
        itemKey: '@kbnTypeaheadKey'
      },

      controller: function ($scope, $element) {
        var self = this;
        $scope.query = undefined;
        $scope.hidden = true;
        $scope.focused = false;
        $scope.mousedOver = false;
        $scope.filteredItems = [];

        self.getItemValue = function (item) {
          return ($scope.itemKey) ? item[$scope.itemKey] : item;
        };

        self.setInputModel = function (model) {
          $scope.inputModel = model;

          // watch for changes to the query parameter, delegate to typeaheadCtrl
          $scope.$watch('inputModel.$modelValue', self.filteredItemsByQuery);
        };

        self.setFocused = function (focused) {
          $scope.focused = !!(focused);
        };

        self.setMouseover = function (mousedOver) {
          $scope.mousedOver = !!(mousedOver);
        };

        // activation methods
        self.activateItem = function (item) {
          self.active = item;
        };

        self.getActiveIndex = function () {
          if (!self.active) {
            return;
          }

          return $scope.filteredItems.indexOf(self.active);
        };

        self.activateNext = function () {
          var index = self.getActiveIndex();
          if (index == null) {
            index = 0;
          } else if (index < $scope.filteredItems.length - 1) {
            ++index;
          }

          self.activateItem($scope.filteredItems[index]);
        };

        self.activatePrev = function () {
          var index = self.getActiveIndex();

          if (index > 0 && index != null) {
            --index;
          } else if (index === 0) {
            self.active = false;
            return;
          }

          self.activateItem($scope.filteredItems[index]);
        };

        self.isActive = function (item) {
          return item === self.active;
        };

        // selection methods
        self.selectItem = function (item) {
          $scope.hidden = true;
          self.active = false;
          $scope.inputModel.$setViewValue(self.getItemValue(item));
          $scope.inputModel.$render();

          self.submitForm();
        };

        self.submitForm = function () {
          $element.closest('form').submit();
        };

        self.selectActive = function () {
          if (self.active) {
            self.selectItem(self.active);
          }
        };

        self.keypressHandler = function (ev) {
          var keyCode = ev.which || ev.keyCode;

          if ($scope.focused) {
            $scope.hidden = false;
          }

          // hide on escape
          if (_.contains([keyMap.ESC], keyCode)) {
            $scope.hidden = true;
          }

          // change selection with arrow up/down
          if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
            if (self.isVisible() && $scope.filteredItems.length) {
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
            $scope.hidden = true;
          }
        };

        self.filteredItemsByQuery = function (query) {
          // cache query so we can call it again if needed
          $scope.query = query;

          // if the query is empty, clear the list items
          if (!query.length) {
            $scope.filteredItems = [];
            return;
          }

          // update the filteredItems using the query
          var re = new RegExp(query, 'i');
          $scope.filteredItems = $scope.items.filter(function (item) {
            var value = self.getItemValue(item);
            return !!(value.match(re));
          });
        };

        self.isVisible = function () {
          return !$scope.hidden && ($scope.focused || $scope.mousedOver) && $scope.filteredItems.length;
        };

        // handle updates to parent scope history
        $scope.$watch('items', function (items) {
          self.items = items;

          if ($scope.query) {
            self.filteredItemsByQuery($scope.$query);
          }
        });

        // watch for changes to the filtered item list
        $scope.$watch('filteredItems', function (filteredItems) {
          self.filteredItems = filteredItems;

          // if list is empty, or active item is missing, unset active item
          if (!filteredItems.length || !_.contains($scope.filteredItems, self.active)) {
            self.active = false;
          }
        });
      },

      link: function ($scope, $el, attr) {
        // should be defined via setInput() method
        if (!$scope.inputModel) {
          throw new Error('kbn-typeahead-input must be defined');
        }
      }
    };
  });

  typeahead.directive('kbnTypeaheadInput', function () {
    return {
      restrict: 'A',
      require: ['^ngModel', '^kbnTypeahead'],

      link: function ($scope, $el, $attr, deps) {
        var model = deps[0];
        var typeaheadCtrl = deps[1];

        typeaheadCtrl.setInputModel(model);

        // add handler to get query fro`m input
        var getQuery = function () {
          return model.$modelValue;
        };

        // handle keypresses
        $el.on('keydown', function (ev) {
          $scope.$apply(function () {
            typeaheadCtrl.keypressHandler(ev);
          });
        });

        // update focus state based on the input focus state
        $el.on('focus', function () {
          typeaheadCtrl.setFocused(true);
        });

        $el.on('blur', function () {
          $scope.$apply(function () {
            typeaheadCtrl.setFocused(false);
          });
        });

        // unbind event listeners
        $scope.$on('$destroy', function () {
          $el.off();
        });
      }
    };
  });

  typeahead.directive('kbnTypeaheadItems', function () {
    return {
      restrict: 'E',
      require: '^kbnTypeahead',
      replace: true,
      template: listTemplate,

      link: function ($scope, $el, attr, typeaheadCtrl) {
        $scope.typeahead = typeaheadCtrl;

        // control the mouse state of the typeahead
        $el.on('mouseover', function () {
          typeaheadCtrl.setMouseover(true);
        });

        $el.on('mouseleave', function () {
          typeaheadCtrl.setMouseover(false);
        });

        // unbind all events when removed
        $scope.$on('$destroy', function () {
          $el.off();
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
        $scope.typeahead = typeaheadCtrl;

        // activate items on mouse enter
        $el.on('mouseenter', function (e) {
          $scope.$apply(function () {
            typeaheadCtrl.activateItem(item);
          });
        });

        // select specific list item when clicked
        $el.on('click', function (e) {
          $scope.$apply(function () {
            typeaheadCtrl.selectItem(item);
          });
        });

        // unbind all events when removed
        $scope.$on('$destroy', function () {
          $el.off();
        });
      }
    };
  });

});
