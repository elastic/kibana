define(function (require) {
  return function AggsService(Private) {
    return [
      Private(require('./date_histogram')),
      Private(require('./histogram')),
      Private(require('./terms'))
    ];
  };
});