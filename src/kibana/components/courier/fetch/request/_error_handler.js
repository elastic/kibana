define(function (require) {
  return function RequestErrorHandlerFactory(Private, Notifier) {
    var errorHandlers = Private(require('components/courier/_error_handlers'));

    var notify = new Notifier({
      location: 'Courier Fetch Error'
    });

    function handleError(req, error) {
      var handlerCount = 0;
      errorHandlers.splice(0).forEach(function (handler) {
        if (handler.source !== req.source) return errorHandlers.push(handler);
        handler.defer.resolve(error);
        handlerCount++;
      });

      if (!handlerCount) {
        notify.fatal(new Error('unhandled error ' + (error.stack || error.message)));
      }
    }

    return handleError;
  };
});