define(function (require) {
  return function RespConvertersService(Private) {
    return {
      histogram: Private(require('./histogram'))
    };
  };
});