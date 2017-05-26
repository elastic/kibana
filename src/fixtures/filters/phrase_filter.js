export const phraseFilter = {
  'meta': {
    'index': 'foo',
    'type': 'phrase',
    'key': 'bar',
    'value': 'baz',
    'disabled': false,
    'negate': false,
    'alias': null
  },
  'query': {
    'match': {
      'source_name': {
        'query': 'baz',
        'type': 'phrase'
      }
    }
  },
  '$state': {
    'store': 'appState'
  }
};
