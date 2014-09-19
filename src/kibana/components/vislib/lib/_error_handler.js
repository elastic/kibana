define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function ErrorHandlerFactory(Private) {
    var errMessage = 'The size of this container is too small.';

    // Common errors shared between constructors
    function ErrorHandler() {}

    // Validate that the height and width are not 0 or NaN
    ErrorHandler.prototype.validateWidthandHeight = function (width, height, checkWidth, checkHeight) {
      // min size must be at least 1px
      checkWidth = checkWidth || 1;
      checkHeight = checkHeight || 1;
      var badWidth = _.isNaN(width) || width < checkWidth;
      var badHeight = _.isNaN(height) || height < checkHeight;

      if (badWidth || badHeight) {
        throw new errors.ContainerTooSmall('Expected ' + checkWidth + ', ' + checkHeight +
          ', got ' + width + ', ' + height);
      }
    };

    return ErrorHandler;
  };
});