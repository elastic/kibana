define(function (require) {
  return function RequestErrorHandlerFactory(Private, Notifier) {
    var errHandlers = Private(require('components/courier/_error_handlers'));

    var notify = new Notifier({
      location: 'Courier Fetch Error'
    });

    function handleError(req, error) {
      var myHandlers = [];

      errHandlers.splice(0).forEach(function (handler) {
        (handler.source === req.source ? myHandlers : errHandlers).push(handler);
      });

      if (!myHandlers.length) {
        notify.fatal(new Error('unhandled error ' + (error.stack || error.message)));
      } else {
        myHandlers.forEach(function (handler) {
          handler.defer.resolve(error);
        });
      }
    }

    return handleError;
  };
});