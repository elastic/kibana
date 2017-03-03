import _ from 'lodash';
// bar sizes are measured in milliseconds so this assumes that the different
// between timestamps is in milliseconds. A normal bar size is 70% which gives
// enough spacing for the bar.
export default (series, multipier = 0.7) => {
  const first = _.first(series);
  try {
    return ((first.data[1][0] - first.data[0][0])) * multipier;
  } catch (e) {
    return 1000; // 1000 ms
  }
};
