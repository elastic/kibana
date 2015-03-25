define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');

  module.directive('inTimeErrors', function () {
    return {
      restrict: 'C',
      require: 'form',
      link: function ($scope, $elem, attrs, formController) {
        // expose a variable for other sections to not show errors
        formController.hideErrors = true;

        // set the errors to hide off of the back
        $elem.addClass('hide-errors');

        var handleAttemptedSubmit = function (evt) {
          var $el = $(evt.target);
          var isInput = $el.is(':input');
          var isSubmit = $el.is('button[type="submit"]');
          var pressedEnterKey = (evt.type === 'keydown' && evt.which === 13);
          var clickedMouse = evt.type === 'click';

          // if the evt is a click on the submit
          // or if the evt is a enter key on an input ?not a textarea?
          // unbind this event and show the errors on the form
          if ((isInput && pressedEnterKey) || (isSubmit && clickedMouse)) {
            // unbind events
            $elem.off('.inTimeErrors');
            // switch off the flag
            formController.hideErrors = false;
            // remove the class from the form
            $elem.removeClass('hide-errors');
          }
        };
        // Since the submit gets default prevented if there are errors,
        // listen for lowerlevel events, and determine if it was an attempted submit
        $elem.on('keydown.inTimeErrors', handleAttemptedSubmit);
        $elem.on('click.inTimeErrors', handleAttemptedSubmit);
      }
    };
  });
});
