define(function (require) {
  var _ = require('lodash');

  require('components/number_list/number_list_input');

  require('modules')
  .get('kibana')
  .directive('kbnNumberList', function () {
    return {
      restrict: 'E',
      template: require('text!components/number_list/number_list.html'),
      controllerAs: 'numberListCntr',
      require: 'ngModel',
      controller: function ($scope, $attrs, $parse) {
        var self = this;

        // Called from the pre-link function once we have the controllers
        self.init = function (modelCntr) {
          self.modelCntr = modelCntr;

          self.getList = function () {
            return self.modelCntr.$modelValue;
          };

          self.getUnitName = attrGetter('unitName', 'number');
          self.getMin = attrGetter('min', 0, _.parseInt);
          self.getMax = attrGetter('max', Infinity, _.parseInt);

          function attrGetter(prop, def, transf) {
            var $get = $parse($attrs[prop]);
            transf = transf || _.identity;

            return function () {
              var val = $get($scope);
              return val == null ? def : transf(val);
            };
          }

          /**
           * Remove an item from list by index
           * @param  {number} index
           * @return {undefined}
           */
          self.remove = function (index) {
            var list = self.getList();
            if (!list) return;

            list.splice(index, 1);
          };

          /**
           * Add an item to the end of the list
           * @return {undefined}
           */
          self.add = function () {
            var list = self.getList();
            if (!list) return;

            list.push(_.last(list) + 1);
          };

          /**
           * Check to see if the list is too short.
           *
           * @return {Boolean}
           */
          self.tooShort = function () {
            return _.size(self.getList()) < 1;
          };

          /**
           * Check to see if the list is too short, but simply
           * because the user hasn't interacted with it yet
           *
           * @return {Boolean}
           */
          self.undefinedLength = function () {
            return self.tooShort() && (self.modelCntr.$untouched && self.modelCntr.$pristine);
          };

          /**
           * Check to see if the list is too short
           *
           * @return {Boolean}
           */
          self.invalidLength = function () {
            return self.tooShort() && !self.undefinedLength();
          };

          $scope.$watchCollection(self.getList, function () {
            self.modelCntr.$setValidity('numberListLength', !self.tooShort());
          });
        };
      },
      link: {
        pre: function ($scope, $el, attrs, ngModelCntr) {
          $scope.numberListCntr.init(ngModelCntr);
        }
      },
    };
  });

});
