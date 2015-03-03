define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');

  module.directive('inTimeErrors', function () {
    return {
      // can't require since there is no controller
      // require: 'ng-submit',
      restrict: 'C',
      link: function ($scope, $elem, attrs) {
        // this directive requires a Form element, with a name to reference the errors
        if (!$elem.is('form') || !attrs.name) {
          // TODO maybe throw an error here?
          return false;
        }

        var formObj = $scope[attrs.name];
        // expose a variable for other sections to not show errors
        formObj.hideErrors = true;

        // set the errors to hide off of the back
        $elem.addClass('hide-errors');

        // wait for a submit and then show the errors
        $elem.one('submit.inTimeErrors', function () {
          $elem.removeClass('hide-errors');
          formObj.hideErrors = false;
        });
      }
    };
  });
});
