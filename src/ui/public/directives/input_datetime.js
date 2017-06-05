import moment from 'moment';
import { uiModules } from 'ui/modules';
const module = uiModules.get('kibana');

module.directive('inputDatetime', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, $elem, attrs, ngModel) {

      const format = 'YYYY-MM-DD HH:mm:ss.SSS';

      $elem.after('<div class="input-datetime-format">' + format + '</div>');

      // What should I make with the input from the user?
      const fromUser = function (text) {
        const parsed = moment(text, format);
        return parsed.isValid() ? parsed : undefined;
      };

      // How should I present the data back to the user in the input field?
      const toUser = function (datetime) {
        return moment(datetime).format(format);
      };

      ngModel.$parsers.push(fromUser);
      ngModel.$formatters.push(toUser);

    }
  };
});
