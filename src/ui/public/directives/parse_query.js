import { parseQuery, formatQuery } from 'ui/parse_query';

import { uiModules } from 'ui/modules';
uiModules
  .get('kibana')
  .directive('parseQuery', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        'ngModel': '='
      },
      link: function ($scope, elem, attr, ngModel) {
        ngModel.$parsers.push(parseQuery);
        ngModel.$formatters.push(formatQuery);
      }
    };
  });
