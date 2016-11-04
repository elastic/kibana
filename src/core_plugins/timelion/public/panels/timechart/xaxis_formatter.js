import moment from 'moment';

module.exports = function xaxisFormatterProvider(config) {

  function getFormat(esInterval) {
    const parts = esInterval.match(/(\d+)(ms|s|m|h|d|w|M|y|)/);
    if (parts == null || parts[1] == null || parts[2] == null) throw new Error ('Unknown interval');

    const interval = moment.duration(Number(parts[1]), parts[2]);

    // Cribbed from Kibana's TimeBuckets class
    const rules = config.get('dateFormat:scaled');

    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule[0] || interval >= moment.duration(rule[0])) {
        return rule[1];
      }
    }

    return config.get('dateFormat');
  }

  return function (esInterval) {
    return getFormat(esInterval);
  };
};
