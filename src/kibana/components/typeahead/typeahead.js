define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');
  var template = require('text!components/typeahead/partials/typeahead.html');

  require('components/typeahead/_input');
  require('components/typeahead/_items');

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
      controllerAs: 'typeahead',

      controller: function ($scope, $element, $timeout) {
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
          $scope.$watch('inputModel.$viewValue', self.filteredItemsByQuery);
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
        self.selectItem = function (item, ev) {
          $scope.hidden = true;
          self.active = false;
          $scope.inputModel.$setViewValue(self.getItemValue(item));
          $scope.inputModel.$render();

          if (ev && ev.type === 'click') {
            $timeout(function () {
              self.submitForm();
            });
          }
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
            self.active = false;
          }

          // change selection with arrow up/down
          // on down key, attempt to load all items if none are loaded
          if (_.contains([keyMap.DOWN], keyCode) && $scope.filteredItems.length === 0) {
            $scope.filteredItems = $scope.items;
            $scope.$digest();
          } else if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
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
});
