export const rangeFilter = {
  'meta': {
    'index': 'logstash-*',
    'negate': false,
    'disabled': false,
    'alias': null,
    'type': 'range',
    'key': 'bytes',
    'value': '0 to 10'
  },
  'range': {
    'bytes': {
      'gte': 0,
      'lt': 10
    }
  },
  '$state': {
    'store': 'appState'
  }
};
