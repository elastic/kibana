export default {
  'took': 35,
  'timed_out': false,
  '_shards': {
    'total': 7,
    'successful': 7,
    'failed': 0
  },
  'hits': {
    'total': 218512,
    'max_score': 0,
    'hits': []
  },
  'aggregations': {
    '1': {
      'buckets': {
        '*-1024.0': {
          'to': 1024,
          'to_as_string': '1024.0',
          'doc_count': 20904
        },
        '1024.0-2560.0': {
          'from': 1024,
          'from_as_string': '1024.0',
          'to': 2560,
          'to_as_string': '2560.0',
          'doc_count': 23358
        },
        '2560.0-*': {
          'from': 2560,
          'from_as_string': '2560.0',
          'doc_count': 174250
        }
      }
    }
  }
};
