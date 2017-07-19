export const phraseFilter = {
  meta: {
    negate: false,
    index: 'logstash-*',
    type: 'phrase',
    key: 'machine.os',
    value: 'ios',
    disabled: false
  },
  query: {
    match: {
      'machine.os': {
        query: 'ios',
        type: 'phrase'
      }
    }
  },
  $state: {
    store: 'appState'
  }
};
