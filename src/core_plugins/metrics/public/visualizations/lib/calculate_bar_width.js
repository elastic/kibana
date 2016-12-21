import _ from 'lodash';
export default (series, divisor = 1, multipier = 0.7) => {
  const first = _.first(series);
  if (_.isPlainObject(first)) {
    try {
      return ((first.data[1][0] - first.data[0][0]) / divisor) * multipier;
    } catch (e) {
      return 1000;
    }
  } else {
    try {
      return (series[1][0] - series[0][0]) / divisor;
    } catch (e) {
      return 1000;
    }
  }

};
