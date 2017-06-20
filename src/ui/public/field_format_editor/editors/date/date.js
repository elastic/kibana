import dateTemplate from './date.html';
import moment from 'moment';

export function dateEditor() {
  return {
    formats: ['date'],
    editor: {
      template: dateTemplate,
      controllerAs: 'cntrl',
      controller: function ($interval, $scope) {
        const self = this;
        self.sampleInputs = [
          Date.now(),
          +moment().startOf('year'),
          +moment().endOf('year')
        ];

        $scope.$on('$destroy', $interval(function () {
          self.sampleInputs[0] = Date.now();
        }, 1000));
      }
    }
  };
}
