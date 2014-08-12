define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');

  require('components/notify/directives');

  typeahead.directive('kbnTypeaheadInput', function ($rootScope) {

    return {
      restrict: 'A',
      require: ['^ngModel', '^kbnTypeahead'],

      link: function ($scope, $el, $attr, deps) {
        var model = deps[0];
        var typeaheadCtrl = deps[1];

        typeaheadCtrl.setInputModel(model);

        // handle keypresses
        $el.on('keydown', function (ev) {
          typeaheadCtrl.keypressHandler(ev);
          digest();
        });

        // update focus state based on the input focus state
        $el.on('focus', function () {
          typeaheadCtrl.setFocused(true);
          digest();
        });

        $el.on('blur', function () {
          typeaheadCtrl.setFocused(false);
          digest();
        });

        // unbind event listeners
        $scope.$on('$destroy', function () {
          $el.off();
        });

        function digest() {
          $rootScope.$$phase || $scope.$digest();
        }
      }
    };
  });
});