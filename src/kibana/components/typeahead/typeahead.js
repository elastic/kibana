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
        self.query = undefined;
        self.hidden = true;
        self.focused = false;
        self.mousedOver = false;
        self.filteredItems = [];

        self.getItemValue = function (item) {
          return ($scope.itemKey) ? item[$scope.itemKey] : item;
        };

        self.setInputModel = function (model) {
          $scope.inputModel = model;

          // watch for changes to the query parameter, delegate to typeaheadCtrl
          $scope.$watch('inputModel.$viewValue', self.filteredItemsByQuery);
        };

        self.setHidden = function (hidden) {
          self.hidden = !!(hidden);
        };

        self.setFocused = function (focused) {
          self.focused = !!(focused);
        };

        self.setMouseover = function (mousedOver) {
          self.mousedOver = !!(mousedOver);
        };

        // activation methods
        self.activateItem = function (item) {
          self.active = item;
        };

        self.getActiveIndex = function () {
          if (!self.active) {
            return;
          }

          return self.filteredItems.indexOf(self.active);
        };

        self.activateNext = function () {
          var index = self.getActiveIndex();
          if (index == null) {
            index = 0;
          } else if (index < self.filteredItems.length - 1) {
            ++index;
          }

          self.activateItem(self.filteredItems[index]);
        };

        self.activatePrev = function () {
          var index = self.getActiveIndex();

          if (index > 0 && index != null) {
            --index;
          } else if (index === 0) {
            self.active = false;
            return;
          }

          self.activateItem(self.filteredItems[index]);
        };

        self.isActive = function (item) {
          return item === self.active;
        };

        // selection methods
        self.selectItem = function (item, ev) {
          self.hidden = true;
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

          if (self.focused) {
            self.hidden = false;
          }

          // hide on escape
          if (_.contains([keyMap.ESC], keyCode)) {
            self.hidden = true;
            self.active = false;
          }

          // change selection with arrow up/down
          // on down key, attempt to load all items if none are loaded
          if (_.contains([keyMap.DOWN], keyCode) && self.filteredItems.length === 0) {
            self.filteredItems = $scope.items;
            $scope.$digest();
          } else if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
            if (self.isVisible() && self.filteredItems.length) {
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
            self.hidden = true;
          }
        };

        self.filteredItemsByQuery = function (query) {
          // cache query so we can call it again if needed
          self.query = query;

          // if the query is empty, clear the list items
          if (!query.length) {
            self.filteredItems = [];
            return;
          }

          // update the filteredItems using the query
          var re = new RegExp(query, 'i');
          self.filteredItems = $scope.items.filter(function (item) {
            var value = self.getItemValue(item);
            return !!(value.match(re));
          });
        };

        self.isVisible = function () {
          return !self.hidden && (self.focused || self.mousedOver) && self.filteredItems.length;
        };

        // handle updates to parent scope history
        $scope.$watch('items', function (items) {
          self.items = items;

          if (self.query) {
            self.filteredItemsByQuery($scope.$query);
          }
        });

        // watch for changes to the filtered item list
        $scope.$watch('filteredItems', function (filteredItems) {
          self.filteredItems = filteredItems;

          // if list is empty, or active item is missing, unset active item
          if (!filteredItems.length || !_.contains(self.filteredItems, self.active)) {
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
