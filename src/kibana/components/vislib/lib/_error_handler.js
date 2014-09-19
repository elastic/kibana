define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function ErrorHandlerFactory(Private) {
    var errMessage = 'The size of this container is too small.';

    // Common errors shared between constructors
    function ErrorHandler() {}

    function comparitor(badWidth, badHeight, msg) {
      if (badWidth || badHeight) {
        throw new errors.ContainerTooSmall(msg);
      }
    }

    // Validate the height and width are > 0
    ErrorHandler.prototype.validateWidthandHeight = function (width, height) {
      // min size must be at least 1px
      var badWidth = _.isNaN(width) || width <= 0;
      var badHeight = _.isNaN(height) || height <= 0;

      comparitor(badWidth, badHeight);
    };

    ErrorHandler.prototype.checkDimensions = function (width, height, checkWidth, checkHeight) {
      // min size must be at least 1px
      var badWidth = _.isNaN(width) || width < checkWidth;
      var badHeight = _.isNaN(height) || height < checkHeight;
      var errorMessage = 'Expected ' + checkWidth + ', ' + checkHeight +
        ', got ' + width + ', ' + height;

      comparitor(badWidth, badHeight, errorMessage);
    };

    return ErrorHandler;
  };
});