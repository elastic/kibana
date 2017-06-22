import dateTemplate from './date.html';
import moment from 'moment';

export function dateEditor() {
  return {
    formatId: 'date',
    template: dateTemplate,
    controllerAs: 'cntrl',
    controller: function ($interval, $scope) {
      this.sampleInputs = [
        Date.now(),
        moment().startOf('year').valueOf(),
        moment().endOf('year').valueOf()
      ];

      const stop = $interval(() => {
        this.sampleInputs[0] = Date.now();
      }, 1000);
      $scope.$on('$destroy', () => {
        $interval.cancel(stop);
      });
    }
  };
}
