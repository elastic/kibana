define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');

  module.directive('inTimeErrors', function () {
    return {
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

        var handleAttemptedSub = function (evt) {
          var $el = $(evt.target);
          var isInput = $el.is(':input');
          var isSubmit = $el.is('button[type="submit"]');
          var pressedEnterKey = (evt.type === 'keydown' && evt.which === 13);
          var clickedMouse = evt.type === 'click';

          // if the evt is a click on the submit
          // or if the evt is a enter key on an input not a textarea
          // unbind this event and show the errors on the form
          if ((isInput && pressedEnterKey) || (isSubmit && clickedMouse)) {
            // unbind events
            $elem.off('.inTimeErrors');
            // switch off the flag
            formObj.hideErrors = false;
            // remove the class from the form
            $elem.removeClass('hide-errors');
          }
        };
        // Since the submit gets default prevented if there are errors,
        // listen for lowerlevel events, and determine if it was an attempted submit
        $elem.on('keydown.inTimeErrors', handleAttemptedSub);
        $elem.on('click.inTimeErrors', handleAttemptedSub);
      }
    };
  });
});
