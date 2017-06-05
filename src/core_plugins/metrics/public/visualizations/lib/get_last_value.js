import _ from 'lodash';
export default (data, lookback = 2) => {
  if (_.isNumber(data)) return data;
  if (!Array.isArray(data)) return 0;
  // First try the last value
  const last = data[data.length - 1];
  const lastValue = Array.isArray(last) && last[1];
  if (lastValue) return lastValue;

  // If the last value is zero or null because of a partial bucket or
  // some kind of timeshift weirdness we will show the second to last.
  let lookbackCounter = 1;
  let value;
  while (lookback > lookbackCounter && !value) {
    const next = data[data.length - ++lookbackCounter];
    value =  _.isArray(next) && next[1] || 0;
  }
  return value || 0;
};

