define(function (require) {
  var hits = require('fixtures/real_hits');

  return {
    took: 73,
    timed_out: false,
    _shards: {
      total: 144,
      successful: 144,
      failed: 0
    },
    hits: {
      total : 49487,
      max_score : 1.0,
      hits: hits
    }
  };
});