import moment from 'moment-timezone';

export function KibanaRootController($scope, courier, config) {
  config.watch('dateFormat:tz', setDefaultTimezone, $scope);
  config.watch('dateFormat:dow', setStartDayOfWeek, $scope);

  function setDefaultTimezone(tz) {
    moment.tz.setDefault(tz);
  }

  function setStartDayOfWeek(day) {
    const dow = moment.weekdays().indexOf(day);
    moment.updateLocale(moment.locale(), { week: { dow } });
  }
}
