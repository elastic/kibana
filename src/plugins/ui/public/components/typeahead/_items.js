define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');
  var listTemplate = require('text!components/typeahead/partials/typeahead-items.html');

  require('components/notify/directives');

  typeahead.directive('kbnTypeaheadItems', function () {
    return {
      restrict: 'E',
      require: '^kbnTypeahead',
      replace: true,
      template: listTemplate,

      link: function ($scope, $el, attr, typeaheadCtrl) {
        $scope.typeahead = typeaheadCtrl;
      }
    };
  });
});
