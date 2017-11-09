export const existsFilter = {
  'meta': {
    'index': 'logstash-*',
    'negate': false,
    'disabled': false,
    'type': 'exists',
    'key': 'machine.os',
    'value': 'exists'
  },
  'exists': {
    'field': 'machine.os'
  },
  '$state': {
    'store': 'appState'
  }
};
