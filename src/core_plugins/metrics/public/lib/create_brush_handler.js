import moment from 'moment';
export default ($scope, timefilter) => ranges => {
  $scope.$evalAsync(() => {
    timefilter.time.from = moment(ranges.xaxis.from).toISOString();
    timefilter.time.to = moment(ranges.xaxis.to).toISOString();
    timefilter.time.mode = 'absolute';
  });
};
