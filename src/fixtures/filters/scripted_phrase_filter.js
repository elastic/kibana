export const scriptedPhraseFilter = {
  'meta': {
    'negate': false,
    'index': 'logstash-*',
    'field': 'script string',
    'type': 'phrase',
    'key': 'script string',
    'value': 'i am a string',
    'disabled': false
  },
  'script': {
    'script': {
      'inline': 'boolean compare(Supplier s, def v) {return s.get() == v;}compare(() -> { \'i am a string\' }, params.value);',
      'lang': 'painless',
      'params': {
        'value': 'i am a string'
      }
    }
  },
  '$state': {
    'store': 'appState'
  }
};
