export const phrasesFilter = {
  meta: {
    index: 'logstash-*',
    type: 'phrases',
    key: 'machine.os.raw',
    value: 'win xp, osx',
    params: [
      'win xp',
      'osx'
    ],
    negate: false,
    disabled: false
  },
  query: {
    bool: {
      should: [
        {
          match_phrase: {
            'machine.os.raw': 'win xp'
          }
        },
        {
          match_phrase: {
            'machine.os.raw': 'osx'
          }
        }
      ],
      minimum_should_match: 1
    }
  },
  $state: {
    store: 'appState'
  }
};
