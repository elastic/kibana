define(function (require) {
  return function ErrorHandlerFactory(Private) {
    var _ = require('lodash');

    function ErrorHandler() {}

    ErrorHandler.prototype.validateWidthandHeight = function (width, height) {
      if (_.isNaN(height) || height <= 0 || _.isNaN(width) || width <= 0) {
        throw new Error('The height and/or width of this container is too ' +
          'small for this chart. Height: ' + height + ', width: ' + width);
      }
      return;
    };

    return ErrorHandler;
  };
});