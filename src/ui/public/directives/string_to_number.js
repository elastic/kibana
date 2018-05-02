import { uiModules } from '../modules';
const module = uiModules.get('kibana');

module.directive('stringToNumber', function () {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      ngModel.$formatters.push((value) => {
        return parseFloat(value);
      });
    }
  };
});
