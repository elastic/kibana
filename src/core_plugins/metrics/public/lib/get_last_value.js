import _ from 'lodash';
export default (data) => {
  if (!Array.isArray(data)) return 0;
  // First try the last value
  const last = data[data.length - 1];
  const lastValue = Array.isArray(last) && last[1];
  if (lastValue) return lastValue;

  // If the last value is zero or null because of a partial bucket or
  // some kind of timeshift weirdness we will show the second to last.
  const secondToLast = data[data.length - 2];
  return _.isArray(secondToLast) && secondToLast[1] || 0;
};
