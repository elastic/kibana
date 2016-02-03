import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');

module.directive('inputDatetime', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, attrs, ngModel) {

      var format = 'YYYY-MM-DD HH:mm:ss.SSS';

      $elem.after('<div class="input-datetime-format">' + format + '</div>');

      // What should I make with the input from the user?
      var fromUser = function (text) {
        var parsed = moment(text, format);
        return parsed.isValid() ? parsed : undefined;
      };

      // How should I present the data back to the user in the input field?
      var toUser = function (datetime) {
        return moment(datetime).format(format);
      };

      ngModel.$parsers.push(fromUser);
      ngModel.$formatters.push(toUser);

    }
  };
});
